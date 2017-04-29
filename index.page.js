// Distance in feet to speak approaching street.
var m_dblApproachDistanceKm = convertFTtoKM(200.0);

// Intersection history, last X items.
var m_aryIntersectionHistory = new Array();

var m_strLastIntersection = "";
var m_strLastAddress = "";


$(document).ready(function()
{
  m_strUsername = "julied4";
  
  document.getElementById('edAddressTimeout').value = Number(m_iAddrFrequencyMs / 1000).toFixed(1);
  document.getElementById('edIntersectionTimeout').value = Number(m_iIntersectionFrequencyMs / 1000).toFixed(1);
  document.getElementById('edIntersectionApproach').value = Number(convertKMtoFT(m_dblApproachDistanceKm)).toFixed(1);
    
  if('speechSynthesis' in window) 
  {
    // You're good to go!
  }
  else 
  {
    alert("Text to Speech is not available in this browser");
  }
  
  if('geolocation' in navigator)
  {
    // You're good to go!
  }
  else
  {
    alert("Geolocation is not available in this browser");
  }
  
  $("#btnFollowStreets").click(function(e)
  {
    // Stops our form from resetting and going to the top of the page.
    // If the form is just a div, preventDefault is not needed.
    e.preventDefault();
    
    if(m_idFollowStreets == 0)
    {
      // This is stupid, but ios needs some text spoken here.
      SpeakText("Start");
      
      StartFollowingStreets();
      this.value = "Stop";
    }
    else
    {
      SpeakText("Stop");
      StopFollowingStreets();
      this.value = "Start";
      
      // Reset our values
      m_aryIntersectionHistory.length = 0;

	  m_strLastIntersection = "";
      m_strLastAddress = "";
    }
  });
    
  $("#btnCurrentLocation").click(function(e)
  {
    // Stops our form from resetting and going to the top of the page.
    // If the form is just a div, preventDefault is not needed.
    e.preventDefault();

    SpeakText("Location");
    
    m_strLastAddress = "";
    
    GetCurrentLocation();    
  });
  
  $("#btnApplySettings").click(function(e)
  {
    m_iIntersectionFrequencyMs = Math.max(document.getElementById('edIntersectionTimeout').value * 1000, 1500);
    m_iAddrFrequencyMs = document.getElementById('edAddressTimeout').value * 1000;
    if(m_idFollowStreets != 0)
    {
      StopFollowingStreets();
      StartFollowingStreets();
    }
  
    m_dblApproachDistanceKm = convertFTtoKM(document.getElementById('edIntersectionApproach').value);
  });
  
  //alert(GetBearing({latitude: 39.099912, longitude: -94.581213}, {latitude: 38.627089, longitude: -90.200203}));
});

function OnGetGeoCoordinates(position)
{
  if(position.coords.speed
  || position.coords.heading)
  {
    var strDirection = "";
    if(position.coords.heading < 23 || position.coords.heading > 337)
    {
      strDirection = "N";
    }
    else if(position.coords.heading < 67)
    {
      strDirection = "NE";
    }
    else if(position.coords.heading < 113)
    {
      strDirection = "E";
    }
    else if(position.coords.heading < 157)
    {
      strDirection = "SE";
    }
    else if(position.coords.heading < 203)
    {
      strDirection = "S";
    }
    else if(position.coords.heading < 248)
    {
      strDirection = "SW";
    }
    else if(position.coords.heading < 293)
    {
      strDirection = "W";
    }
    else
    {
      strDirection = "NW";
    }
    
    document.getElementById('tdSpeedDirection').value = position.coords.speed.toString() + " m/s " + strDirection;
  }
  
  document.getElementById('edDebug').value += "lat: " + position.coords.latitude.toString() + " lng: " + position.coords.longitude.toString() + " acc: " + Number(convertKMtoFT(position.coords.accuracy / 1000)).toFixed(3) + ' ft\n';
};

function OnGetCurrentPositionError(positionError)
{
  var date = new Date();
  var strError = date + ": Error getCurrentPosition (" + positionError.code + "): " + positionError.message;
  
  console.warn(strError);
  
  document.getElementById('edError'). value += strError + '\n';
};

function OnWatchPositionError(positionError)
{
  var date = new Date();
  var strError = date + ": Error watchPosition (" + positionError.code + "): " + positionError.message;
  
  console.warn(strError);
  
  document.getElementById('edError'). value += strError + '\n';
};

function OnGetCurrentLocation(response)
{
  if (response.readyState == 4 && response.status == 200) 
  {
    //document.getElementById('edCurrentLocation').value = response.responseText;
    
    var jsonObj = JSON.parse(response.responseText);
  
    var strFullAddress = jsonObj.address.streetNumber + " " + jsonObj.address.street;
    strFullAddress += "<br />" + jsonObj.address.placename + ", " + jsonObj.address.adminName1 + " " + jsonObj.address.postalcode;
    strFullAddress += "<br />Within " + Number(convertKMtoFT(jsonObj.address.distance)).toFixed(1) + " ft";
    $("#tdAddress").html(strFullAddress);
    
    document.getElementById('edDebug').value += "addr: " + jsonObj.address.streetNumber + " " + jsonObj.address.street + '\n';
    
    if((jsonObj.address.streetNumber + " " + jsonObj.address.street) != m_strLastAddress)
    {
      // Get the street number and street to send to the speech synthesizer.
      SpeakText(jsonObj.address.streetNumber + " " + jsonObj.address.street);
      m_strLastAddress = jsonObj.address.streetNumber + " " + jsonObj.address.street;
    }
  }
};

function OnGetNearestIntersection(response)
{
  if (response.readyState == 4 && response.status == 200) 
  {
    //document.getElementById('edIntersection').value = response.responseText;

    var jsonObj = JSON.parse(response.responseText);
  
    if(!jsonObj.intersection)
    {
      return;
    }
  
    var strIntersection = jsonObj.intersection.street1+ "/" + jsonObj.intersection.street2;
    strIntersection += "<br />Dist: " + Number(convertKMtoFT(jsonObj.intersection.distance)).toFixed(1) + " ft";
    $("#tdIntersection").html(strIntersection);
    
    var intersection = {street1:jsonObj.intersection.street1, street2: jsonObj.intersection.street2, distance: jsonObj.intersection.distance};
    
    if(m_aryIntersectionHistory.length >= 10)
    {
      m_aryIntersectionHistory.shift();
    }
    
    m_aryIntersectionHistory.push(intersection);
    
    if(intersection.distance <= m_dblApproachDistanceKm
      && (jsonObj.intersection.street1 + " " + jsonObj.intersection.street2) != m_strLastIntersection)
    {
      // Get the street number and street to send to the speech synthesizer.
      SpeakText(jsonObj.intersection.street1 + " and " + jsonObj.intersection.street2);
      m_strLastIntersection = jsonObj.intersection.street1 + " " + jsonObj.intersection.street2;
    }  
  }
};

function convertKMtoFT(dblKM)
{
  return 3280.84 * dblKM;
};

function convertFTtoKM(dblFT)
{
  return dblFT / 3280.84;
};
