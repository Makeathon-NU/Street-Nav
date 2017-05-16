/**
 * index.page.js
 * Contains functions for updating the GUI and calling functions outside of here.
 *
 * Made for TOM Makeathon at Northwestern University
 *
 * @license MIT license
 * @version 1.0
 * @author  Daniel Bednarczyk, Darcy Green (Need Knower), Joe Cummings, Julie Davies, Megan Reid, Wong Song Wei
 * @updated 2017-05-16
 * @link    https://makeathon-nu.github.io/Street-Nav/
 *
 * If address or intersection aren't working:
 *  Be sure that the username is entered correctly, capitalization matters.
 *  GPS must be enabled for the app or web browser on the device.
 *  Try clearing the cache for the web browser.
 *  Allow the browser to know your location.
 *
 * If text to speech isn't working:
 *  Turn the ringer on. iOS needs the ringer on for text to speech.
 *
 * Callback functions for geofunctions.js:
 *  OnGetGeoCoordinates(position)
 *  OnGetCurrentPositionError(positionError)
 *  OnWatchPositionError(positionError)
 *  OnGetCurrentLocation(response)
 *  OnGetNearestIntersection(response)
 *  
 */

// Distance in feet to speak approaching street.
var m_dblApproachDistanceKm = convertFTtoKM(200.0);

// Speak location when retrieved
var m_bSpeakLocation = false;

// Position history, last X items.
var m_aryPositionHistory = new Array();

// Amount of time to go back in the history to get a bearing
// It would be better if this was an amount of distance rather than time.
//   The reason for distance is if you are standing in one place, the bearing will change.
var m_iDirectionTimeMs = 10000;

// Last intersection spoken
var m_strLastIntersection = "";

// Last address spoken
var m_strLastAddress = "";

/**
  Initialization
*/
$(document).ready(function()
{
  // Decide if username information should be shown
  if(isCookieValid("username"))
  {
    // Hide username prompt
    displayMainPage();
  }
  else
  {
    // Hide main content
    displayUsernamePrompt();
  }

  // Display default values
  document.getElementById('edAddressTimeout').value = Number(m_iAddrFrequencyMs / 1000).toFixed(1);
  document.getElementById('edIntersectionTimeout').value = Number(m_iIntersectionFrequencyMs / 1000).toFixed(1);
  document.getElementById('edDirectionTime').value = Number(m_iDirectionTimeMs / 1000).toFixed(1);
  document.getElementById('edIntersectionApproach').value = Number(convertKMtoFT(m_dblApproachDistanceKm)).toFixed(1);
    
  // Show the user if text to speech or geolocation isn't available in the browser
  // This does not check if gps is on.
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
  
  // Click function for following the street intersections
  $("#btnFollowStreets").click(function(e)
  {
    // Stops our form from resetting and going to the top of the page.
    // If the form is just a div, preventDefault is not needed.
    e.preventDefault();
    
    if(m_idFollowStreets == 0)
    {
      // This is stupid, but ios needs some text spoken here.
      SpeakText("Start");
      
      // Start the process and display stop on the GUI.
      StartFollowingStreets();
      this.value = "Stop";
    }
    else
    {
      // This is stupid, but ios needs some text spoken here.
      SpeakText("Stop");
      
      // Stop the process and display start on the GUI
      StopFollowingStreets();
      this.value = "Start";
      
      // Reset our values
	  m_strLastIntersection = "";
      m_strLastAddress = "";
    }
  });
    
  // Click function for getting the current address
  $("#btnCurrentLocation").click(function(e)
  {
    // Stops our form from resetting and going to the top of the page.
    // If the form is just a div, preventDefault is not needed.
    e.preventDefault();

    // This is stupid, but ios needs some text spoken here.
    SpeakText("Location");
    
    // Guarantee the next location found will be spoken.
    m_bSpeakLocation = true;
    m_strLastAddress = "";

    // Get the current address    
    GetCurrentLocation();    
  });
  
  // Click function for applying settings
  $("#btnApplySettings").click(function(e)
  {
    // Update all the settings
    m_iIntersectionFrequencyMs = Math.max(document.getElementById('edIntersectionTimeout').value * 1000, 1500);
    m_iAddrFrequencyMs = document.getElementById('edAddressTimeout').value * 1000;
	m_iDirectionTimeMs = Math.max(document.getElementById('edDirectionTime').value * 1000, 5000);
    m_dblApproachDistanceKm = convertFTtoKM(document.getElementById('edIntersectionApproach').value);

    // Stop and start following the streets so the new settings take effect	
    if(m_idFollowStreets != 0)
    {
      StopFollowingStreets();
      StartFollowingStreets();
    }
  });
  
  // Click function for displaying terms of use
  $("#spanDisclaimer").click(function(e)
  {
    $('#terms_of_use').show();
  });
  
  // Click function for entering a user name for geonames.org
  $('#submitUsername').click(function(e)
  {
    m_strUsername = document.getElementById('edUsername').value;
    if(m_strUsername.length == 0)
    {
      alert('This service may not work until you enter a valid username.\n\nPlease visit http://www.geonames.org/login to create an account.');
    }
    
    // Set the cookie to expire in 10 years.
    setCookie("username", m_strUsername, 10*365);
    
    // Show the main page and scroll back to the top
    displayMainPage();
    scroll(0, 0);
  });
  
  // Click function for resetting the user name for geonames.org
  $('#btnResetUsername').click(function(e)
  {
    // Show the username prompt and scroll back to the top
    displayUsernamePrompt();
    scroll(0, 0);
  });
  
  $('#ckInternational').click(function(e)
  {
    m_bInternational = this.checked;
  });
  
  // On Android, a video can play hidden, but the screen will not go to sleep.
  // Therefore, any code for the video has been removed.
//  if(/(iPad|iPhone|iPod)/g.test(navigator.userAgent) && !window.MSStream)
//  {
//    // This is an apple product that doesn't need to waste the data on the video.
//    $('#videoKeepAwake').remove();
//  }
});


//******************* GEOFUNCTION CALLBACKS ******************************//
/**
  Callback from geofunctions when coordinates have been given
*/
function OnGetGeoCoordinates(position)
{
  var lastPosition = null;
  
  if(m_aryPositionHistory.length > 0)
  {
    lastPosition = m_aryPositionHistory[m_aryPositionHistory.length - 1];
    
    // Add the coordinates to the history if it isn't the same as the last one.
    if(lastPosition.coords.latitude != position.coords.latitude
      && lastPosition.coords.longitude != position.coords.longitude)
    {
      // Only allow 20 items in the history array
      if(m_aryPositionHistory.length > 20)
      {
        m_aryPositionHistory.shift();
      }
  
      // Add the coordinates
      m_aryPositionHistory.push(position);
    }
  }
  else
  {
    // Add the coordinates
    m_aryPositionHistory.push(position);
  }  
  
  var dblBearing = null;
  
  if(position.coords.heading)
  {
    // I have not seen this being set
    dblBearing = position.coords.heading;
  }
  else
  {
    // Get the bearing based on the history
    dblBearing = GetBearingFromPositions(m_aryPositionHistory, m_iDirectionTimeMs);
  }
  
  if(dblBearing)
  {
    // Make sure the bearing is positive
    if(dblBearing < 0)
    {
      dblBearing += 360.0;
    }
    
    // Update the direction in the GUI.
    var strDirection = getDirectionText(dblBearing);
    
    document.getElementById('tdSpeedDirection').innerHTML = strDirection;
  }
  
  // Update debug information for the coordinates
  document.getElementById('edDebug').value += "lat: " + position.coords.latitude.toString() + " lng: " + position.coords.longitude.toString() + " acc: " + Number(convertKMtoFT(position.coords.accuracy / 1000)).toFixed(3) + ' ft\n';
};

/**
  Callback from geofunctions when getting the coordinates errors out due to timeout or other
*/
function OnGetCurrentPositionError(positionError)
{
  // Update debug information with the error
  var date = new Date();
  var strError = date + ": Error getCurrentPosition (" + positionError.code + "): " + positionError.message;
  
  console.warn(strError);
  
  document.getElementById('edError'). value += strError + '\n';
};

/**
  Callback from geofunctions when getting the coordinates errors out due to timeout or other
*/
function OnWatchPositionError(positionError)
{
  // Update debug information with the error
  var date = new Date();
  var strError = date + ": Error watchPosition (" + positionError.code + "): " + positionError.message;
  
  console.warn(strError);
  
  document.getElementById('edError'). value += strError + '\n';
};

/**
  Callback from geofunctions when the current location is received
*/
function OnGetCurrentLocation(response)
{
  if (response.readyState == 4 
    && response.status == 200) 
  {
    // Request is finished and successful

    // Parse the response
    var jsonObj = JSON.parse(response.responseText);
		
    if(!jsonObj.address)
    {
      if(jsonObj.status && jsonObj.status.message)
      {
        // A message indicates there is no address.
        alert(jsonObj.status.message);
        return;
      }
    }
  
    // Piece together the address and update the GUI
    var strFullAddress = jsonObj.address.streetNumber + " " + jsonObj.address.street;
    strFullAddress += "<br />" + jsonObj.address.placename + ", " + jsonObj.address.adminName1 + " " + jsonObj.address.postalcode;
    strFullAddress += "<br />Within " + Number(convertKMtoFT(jsonObj.address.distance)).toFixed(1) + " ft";
    $("#tdAddress").html(strFullAddress);
    
    // Update debug information
    document.getElementById('edDebug').value += "addr: " + jsonObj.address.streetNumber + " " + jsonObj.address.street + '\n';
    
    // Speak the address
    if(m_bSpeakLocation)
    {
      // Get the street number and street to send to the speech synthesizer.
      SpeakText(jsonObj.address.streetNumber + " " + getSpeakingAddress(jsonObj.address.street));
      
      // Update the last address spoken
      m_strLastAddress = jsonObj.address.streetNumber + " " + jsonObj.address.street;
      m_bSpeakLocation = false;
    }
  }
};

/**
  Callback from geofunctions when the nearest intersection is received
*/
function OnGetNearestIntersection(response)
{
  if (response.readyState == 4 
    && response.status == 200) 
  {
    // Request is finished and successful

    // Parse the response
    var jsonObj = JSON.parse(response.responseText);
  
    if(!jsonObj.intersection)
    {
      if(jsonObj.status && jsonObj.status.message)
      {
        // A message indicates there is no intersection.
        alert(jsonObj.status.message);
      }
      return;
    }
  
    // Piece together the intersection and update the GUI
    var strIntersection = jsonObj.intersection.street1+ " / " + jsonObj.intersection.street2;
    strIntersection += "<br />Dist: " + Number(convertKMtoFT(jsonObj.intersection.distance)).toFixed(1) + " ft";
    $("#tdIntersection").html(strIntersection);
    
    var intersection = {street1:jsonObj.intersection.street1, street2: jsonObj.intersection.street2, distance: jsonObj.intersection.distance};
    
    // Speak the address if we are within range to speak
    if(intersection.distance <= m_dblApproachDistanceKm
      && (jsonObj.intersection.street1 + " " + jsonObj.intersection.street2) != m_strLastIntersection)
    {
      // Get the street number and street to send to the speech synthesizer.
      SpeakText(getSpeakingAddress(jsonObj.intersection.street1) + " and " + getSpeakingAddress(jsonObj.intersection.street2));
      
      // Update the last intersection spoken
      m_strLastIntersection = jsonObj.intersection.street1 + " " + jsonObj.intersection.street2;
    }  
  }
};
//******************* END GEOFUNCTION CALLBACKS ******************************//

//******************* COOKIE FUNCTIONS ******************************//
/**
  Set a cookie with the given information
*/
function setCookie(strCookieName, strUsername, iExpiresDays) 
{
  var date = new Date();
  date.setTime(date.getTime() + (iExpiresDays*24*60*60*1000));
  var strExpires = "expires="+ date.toUTCString();
  document.cookie = strCookieName + "=" + strUsername + ";" + strExpires;
}

/**
  Get the cookie
*/
function getCookieValue(strCookieName) 
{
  strCookieName += "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var aryCookiePieces = decodedCookie.split(';');
  for(var i = 0; i < aryCookiePieces.length; i++) 
  {
    var strCookiePiece = aryCookiePieces[i];
    while(strCookiePiece.charAt(0) == ' ') 
    {
      strCookiePiece = strCookiePiece.substring(1);
    }
    if(strCookiePiece.indexOf(strCookieName) == 0) 
    {
      return strCookiePiece.substring(strCookieName.length, strCookiePiece.length);
    }
  }

  return "";
}

/**
  Check if there is a username
*/
function isCookieValid(strCookieName) 
{
  var strCookieValue = getCookieValue(strCookieName);
  return (strCookieValue != "");
}
//******************* END COOKIE FUNCTIONS ******************************//

/**
  Display username prompt
*/
function displayUsernamePrompt()
{
  $('#username_container').show();
  $('#terms_of_use').hide();
  $('#main_container').hide();
}

/**
  Display main page, hide username prompt
*/
function displayMainPage()
{
  $('#username_container').hide();
  $('#terms_of_use').hide();
  $('#main_container').show();
}

/**
  Convert kilometers to feet
*/
function convertKMtoFT(dblKM)
{
  return 3280.84 * dblKM;
};

/**
  Convert feet to kilometers
*/
function convertFTtoKM(dblFT)
{
  return dblFT / 3280.84;
};

/**
  Get the bearing based on the history
*/
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
    // Check the timestamp to see if we are done
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
  
  // Return the bearing from the coordinates
  return GetBearing(fromPosition, toPosition);
};	

/**
  Get the direction text based on the bearing
*/
function getDirectionText(dblBearing)
{
  if(dblBearing < 23 || dblBearing > 337)
  {
    return "N";
  }
  else if(dblBearing < 67)
  {
    return "NE";
  }
  else if(dblBearing < 113)
  {
    return "E";
  }
  else if(dblBearing < 157)
  {
    return "SE";
  }
  else if(dblBearing < 203)
  {
    return "S";
  }
  else if(dblBearing < 248)
  {
    return "SW";
  }
  else if(dblBearing < 293)
  {
    return "W";
  }
  else
  {
    return "NW";
  }
  
  return "";
}

/**
  Get the speaking address.  Change abbreviations the the entire word so speech sounds correct.
  We heard dr as doctor, drive and the letters d-r.  This function converts dr to drive.
*/
function getSpeakingAddress(strAddress)
{
  var strSpeakAddress = "";
  var aryAddressPieces = strAddress.split(" ");
  
  // Get the direction from the first word
  switch(aryAddressPieces[0].toLowerCase())
  {
  case "n":
    strSpeakAddress = "North";
    break;
  case "ne":
    strSpeakAddress = "Northeast";
    break;
  case "nw":
    strSpeakAddress = "Northwest";
    break;
  case "e":
    strSpeakAddress = "East";
    break;
  case "w":
    strSpeakAddress = "West";
    break;
  case "s":
    strSpeakAddress = "South";
    break;
  case "se":
    strSpeakAddress = "Southeast";
    break;
  case "sw":
    strSpeakAddress = "Southwest";
    break;
  default:
    // The first word didn't match anything, add it to the address.
    strSpeakAddress = aryAddressPieces[0];
  }
  
  // Get the middle, everything but the last word
  for(i = 1; i < aryAddressPieces.length - 1; i++)
  {
    strSpeakAddress += " " + aryAddressPieces[i];
  }

  // Get the end of the address from the last word
  for(i = 0; i < m_aryAddrSuffixTable.length; i++)
  {
    var test = m_aryAddrSuffixTable[i][0];
    test = m_aryAddrSuffixTable[i][1];
    if(aryAddressPieces[aryAddressPieces.length - 1].toLowerCase() == m_aryAddrSuffixTable[i][0])
    {
      strSpeakAddress += " " + m_aryAddrSuffixTable[i][1];
      break;
    }
  }
  
  if(i == m_aryAddrSuffixTable.length)
  {
    // The last word didn't match anything in the street abbreviation table, add it to the address.
    strSpeakAddress += " " + aryAddressPieces[aryAddressPieces.length - 1];
  }

  return strSpeakAddress;
}
