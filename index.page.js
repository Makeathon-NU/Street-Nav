// Distance in feet to speak approaching street.
var m_dblApproachDistanceKm = convertFTtoKM(200.0);

var m_bSpeakLocation = false;

// Intersection history, last X items.
var m_aryIntersectionHistory = new Array();

// Position history, last X items.
var m_aryPositionHistory = new Array();
var m_iDirectionTimeMs = 10000;

var m_strLastIntersection = "";
var m_strLastAddress = "";

function setCookie(cname) {
    var date = new Date();
    date.setTime(date.getTime() + (14*24*60*60*1000));
    var expires = "expires="+ date.toUTCString();
    document.cookie = cname + "=" + m_strUsername + ";" + expires;
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function checkCookie() {
    m_strUsername=getCookie("username");
    if (m_strUsername != "") {
        //do nothing
    } else {
       m_strUsername = prompt("To use this service, you must enter your GeoName username below : ", "Username");
       if (m_strUsername != "" && m_strUsername != null) {
           setCookie("username", m_strUsername, 30);
       }
    }
}

function resetCookie() {
		m_strUsername = prompt("To use this service, you must enter your GeoName username below : ", "Username");
    if (m_strUsername != "" && m_strUsername != null) {
         setCookie("username", m_strUsername, 30);
		}
}

$(document).ready(function()
{		
  document.getElementById('edAddressTimeout').value = Number(m_iAddrFrequencyMs / 1000).toFixed(1);
  document.getElementById('edIntersectionTimeout').value = Number(m_iIntersectionFrequencyMs / 1000).toFixed(1);
  document.getElementById('edDirectionTime').value = Number(m_iDirectionTimeMs / 1000).toFixed(1);
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
    m_bSpeakLocation = true;
    
    m_strLastAddress = "";
    
    GetCurrentLocation();    
  });
  
  $("#btnApplySettings").click(function(e)
  {
    m_iIntersectionFrequencyMs = Math.max(document.getElementById('edIntersectionTimeout').value * 1000, 1500);
    m_iAddrFrequencyMs = document.getElementById('edAddressTimeout').value * 1000;
		m_iDirectionTimeMs = Math.max(document.getElementById('edDirectionTime').value * 1000, 5000);
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
  var lastPosition = null;
  if(m_aryPositionHistory.length > 0)
  {
		 lastPosition = m_aryPositionHistory[m_aryPositionHistory.length - 1];
    if(lastPosition.coords.latitude != position.coords.latitude
      && lastPosition.coords.longitude != position.coords.longitude)
    {
      if(m_aryPositionHistory.length > 20)
      {
        m_aryPositionHistory.shift();
      }
  
      m_aryPositionHistory.push(position);
    }
  }
  else
  {
    m_aryPositionHistory.push(position);
  }  
  
  var dblBearing = null;
  
  if(position.coords.heading)
  {
    dblBearing = position.coords.heading;
  }
  else
  {
    dblBearing = GetBearingFromPositions(m_aryPositionHistory, m_iDirectionTimeMs);
  }
  if(dblBearing)
  {
    if(dblBearing < 0)
    {
      dblBearing += 360.0;
    }
    var strDirection = "";
    if(dblBearing < 23 || dblBearing > 337)
    {
      strDirection = "N";
    }
    else if(dblBearing < 67)
    {
      strDirection = "NE";
    }
    else if(dblBearing < 113)
    {
      strDirection = "E";
    }
    else if(dblBearing < 157)
    {
      strDirection = "SE";
    }
    else if(dblBearing < 203)
    {
      strDirection = "S";
    }
    else if(dblBearing < 248)
    {
      strDirection = "SW";
    }
    else if(dblBearing < 293)
    {
      strDirection = "W";
    }
    else
    {
      strDirection = "NW";
    }
    
    document.getElementById('tdSpeedDirection').innerHTML = strDirection;
    
    console.log(dblBearing);
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
		
		if(!jsonObj.address)
    {
      if(jsonObj.status && jsonObj.status.message)
      {
        alert(jsonObj.status.message);
        return;
      }
    }
  
    var strFullAddress = jsonObj.address.streetNumber + " " + jsonObj.address.street;
    strFullAddress += "<br />" + jsonObj.address.placename + ", " + jsonObj.address.adminName1 + " " + jsonObj.address.postalcode;
    strFullAddress += "<br />Within " + Number(convertKMtoFT(jsonObj.address.distance)).toFixed(1) + " ft";
    $("#tdAddress").html(strFullAddress);
    
    document.getElementById('edDebug').value += "addr: " + jsonObj.address.streetNumber + " " + jsonObj.address.street + '\n';
    
    if(m_bSpeakLocation)
    {
      // Get the street number and street to send to the speech synthesizer.
      SpeakText(jsonObj.address.streetNumber + " " + jsonObj.address.street);
      m_strLastAddress = jsonObj.address.streetNumber + " " + jsonObj.address.street;
			m_bSpeakLocation = false;
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
			if(jsonObj.status && jsonObj.status.message)
      {
        alert(jsonObj.status.message);
      }
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
function GetBearingFromPositions(aryPositionHistory, iMilliseconds)
{
  if(aryPositionHistory.length <= 1)
  {
    // Not enough information for a bearing
    return;
  }
  var toPosition = aryPositionHistory[aryPositionHistory.length - 1];
  var fromPosition = null;
  var iRecentTimeMs = toPosition.timestamp;
  
  for(i = aryPositionHistory.length - 2; i >= 0; i--)
  {
    if(toPosition.timestamp - aryPositionHistory[i].timestamp <= iMilliseconds)
    {
      fromPosition = aryPositionHistory[i];
    }
    else
    {
      break;
    }
  }
  
  fromPosition = aryPositionHistory[0];
  
  if(!fromPosition)
  {
    // Too old of a position to use for the bearing.
    return;
  }
  
  return GetBearing(fromPosition, toPosition);
};	
