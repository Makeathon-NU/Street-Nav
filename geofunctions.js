/**
 * geofunctions.js
 * Contains functions for getting geo coordinates and uses the api from geonames.org
 *
 * geonames.org international geocoder is using google geocoder, 
 * reverse geocoding is provided by geonames using openstreemap data 
 * (Feb 2014) under a cc by-sa license.
 *  
 * Powered by geonames.org under a cc by license.
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
 * Callback functions:
 *  OnGetGeoCoordinates(position)
 *  OnGetCurrentPositionError(positionError)
 *  OnWatchPositionError(positionError)
 *  OnGetCurrentLocation(response)
 *  OnGetNearestIntersection(response)
 *  
 */

// Id returned by setTimeout to regularly check for intersections.
var m_idFollowStreets = 0;

// Id returned by setTimeout to regularly check for addresses.
var m_idFollowAddress = 0;

// Username to use for geonames.org
var m_strUsername = "";

// Waiting for GeoNames to return with the current address, one request is outstanding if true.
// Don't want more than one outstanding call to it.
var m_bAddressWaiting = false;

// Waiting for GeoNames to return with the nearest intersection, one request is outstanding if true.
// Don't want more than one outstanding call to it.
var m_bIntersectionWaiting = false;

// Granularity for requesting coordinates when following streets in milliseconds.
// geonames.org allows 2000 credits an hour, which equates to one every 1.8 seconds.
var m_iIntersectionFrequencyMs = 3000;

// Granularity for requesting coordinates when following address in milliseconds.
var m_iAddrFrequencyMs = 10000;

// Use international api, non-United States
var m_bInternational = false;

// This is set to get the current location after getting the coordinates response.
var m_bGetCurrentLocation = false;

// This is set to get the nearest intersection after getting the coordinates response.
var m_bGetNearestIntersection = false;

// Holds the last coordinates given by watchPosition
var m_geoLastCoordinates = null;

// Id returned by watchPosition to regularly get the geolocation coordinates
var m_idWatchPosition = 0;

/*
  Create OnGetGeoCoordinates(position) to receive the coordinates and act on them.
*/
function GetGeoCoordinates()
{
  if(navigator.geolocation) 
  {
    var date = new Date();
    
    if(m_geoLastCoordinates
      && m_geoLastCoordinates.coords.latitude != 0
      && m_geoLastCoordinates.coords.longitude != 0
      && date.getTime() - m_geoLastCoordinates.timestamp <= 10000)
    {
      // Use the last coordinates, they are less than 10 seconds old.
      OnUseCurrentPosition(m_geoLastCoordinates);
      return;
    }
  
    // We don't have a coordinate in the last 10 seconds, try to get one now.
    navigator.geolocation.getCurrentPosition(successGetCurrentPosition, errorGetCurrentPositionAccurate, {maximumAge: 20000, timeout:5000, enableHighAccuracy: true});
  }
  else 
  { 
    alert("Geolocation is not supported by this browser.");
  }
}

/**
  Success function for getCurrentPosition
*/
function successGetCurrentPosition(position)
{
  // Use the coordinates returned.
  OnUseCurrentPosition(position);
};

/**
  Error function for getCurrentPosition when using enableHighAccuracy: false.
*/
function errorGetCurrentPositionLessAccurate(positionError)
{
  // Pass the error onto the GUI 
  OnGetCurrentPositionError(positionError);
};

/**
  Error function for getCurrentPosition when using enableHighAccuracy: true.
*/
function errorGetCurrentPositionAccurate(positionError)
{
  // Try the less accurate getCurrentPosition.
  navigator.geolocation.getCurrentPosition(successGetCurrentPosition, errorGetCurrentPositionLessAccurate, {maximumAge: 20000, timeout:5000, enableHighAccuracy: false});
}

/**
  Success function for watchPosition
*/
function successWatchPosition(position)
{
  // Save the last coordinates
  m_geoLastCoordinates = position;
  
  // See if there is anything to do with the coordinates
  OnUseCurrentPosition(position);
};

/**
  Error function for watchPosition when using enableHighAccuracy: true.
*/
function errorWatchPosition(positionError)
{
  if(m_idWatchPosition != 0)
  {
    // Stop watching and start again
    navigator.geolocation.clearWatch(m_idWatchPosition);
    m_idWatchPosition = navigator.geolocataion.watchPosition(successWatchPosition, errorWatchPosition, {maximumAge: 20000, timeout:10000, enableHighAccuracy: true});
  }

  // Pass the error onto the GUI.
  OnWatchPositionError(positionError);
};

/**
  Operate on the coordinates given
*/
function OnUseCurrentPosition(position)
{
  if(m_bGetCurrentLocation)
  {
    // Get the current address
    GetCurrentLocation(position.coords.latitude, position.coords.longitude);
    m_bGetCurrentLocation = false;
  } 
  
  if(m_bGetNearestIntersection)
  {
    // Get the nearest intersection
    GetNearestIntersection(position.coords.latitude, position.coords.longitude);
    m_bGetNearestIntersection = false;
  }
  
  // Pass the coordinates onto the GUI.
  OnGetGeoCoordinates(position);
};

/*
  Get the current address.
  If no coordinates are given, get coordinates.
*/
function GetCurrentLocation(dblLatitude, dblLongitude)
{
  if(arguments.length == 0
    || (dblLatitude == 0 && dblLongitude == 0))
  {
    // Get coordinates and get the current location using them.
    m_bGetCurrentLocation = true;
    GetGeoCoordinates();
    
    return;
  }

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() 
  {
    if(this.readyState == 4)
    {
      // Request is finished.
      m_bAddressWaiting = false;
    }
    
    // Pass the current location information onto the GUI.
    OnGetCurrentLocation(this);
  };

  if(m_bAddressWaiting)
  {
    // There is already an outstanding call for the current address
    return;
  }

  // Request the current address.
  m_bAddressWaiting = true;
  xhttp.open("GET", "https://secure.geonames.org/findNearestAddressJSON?lat=" + dblLatitude.toString() + "&lng=" + dblLongitude.toString() + "&username=" + m_strUsername, true);
  xhttp.send();
};

/*
  Get the nearest intersection.
  If no coordinates are given, get coordinates.
*/
function GetNearestIntersection(dblLatitude, dblLongitude)
{
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() 
  {
    // Pass the nearest intersection information onto the GUI.
    if(this.readyState == 4)
    {
      // Request is finished.
      m_bIntersectionWaiting = false;
    }

    OnGetNearestIntersection(this);
  };
  
  if(m_bIntersectionWaiting)
  {
    // There is already an outstanding call for the nearest intersection
    return;
  }

  // Request the nearest intersection
  m_bIntersectionWaiting = true;
  if(m_bInternational)
  {
    xhttp.open("GET", "https://secure.geonames.org/findNearestIntersectionOSMJSON?lat=" + dblLatitude.toString() + "&lng=" + dblLongitude.toString() + "&username=" + m_strUsername, true);
  }
  else
  {
    xhttp.open("GET", "https://secure.geonames.org/findNearestIntersectionJSON?lat=" + dblLatitude.toString() + "&lng=" + dblLongitude.toString() + "&username=" + m_strUsername, true);
  }
  xhttp.send();
};

/**
  Start following the street intersections
*/
function StartFollowingStreets()
{
  if(m_idFollowStreets != 0)
  {
    // Already following street intersections
    return;
  }
  
  // Start a timer for intersections
  m_idFollowStreets = setInterval(OnFollowStreetsTimer, m_iIntersectionFrequencyMs);
  
  if(m_iAddrFrequencyMs != 0)
  {
    // Start a timer for the address
    m_idFollowAddress = setInterval(OnFollowAddressTimer, m_iAddrFrequencyMs);
  }
  
  if(m_idWatchPosition == 0)
  {
    // Start getting coordinates regularly
    m_idWatchPosition = navigator.geolocation.watchPosition(successWatchPosition, errorWatchPosition, {maximumAge: 20000, timeout:10000, enableHighAccuracy: true});
  }

  if(m_iAddrFrequencyMs != 0)
  {  
    // Set to get the address
    m_bGetCurrentLocation = true;
  }
    
  // Set to get the intersection
  m_bGetNearestIntersection = true;
  
  // Get the first coordinates
  GetGeoCoordinates();
};

/**
  Stop following the street intersections
*/
function StopFollowingStreets()
{
  // Clear address and intersection timers
  clearTimeout(m_idFollowStreets);
  clearTimeout(m_idFollowAddress);
  
  // Stop getting coordinates
  navigator.geolocation.clearWatch(m_idWatchPosition);
  
  // Reset all id's and variables
  m_idFollowStreets = 0;
  m_idFollowAddress = 0;
  m_idWatchPosition = 0;
  m_bGetNearestIntersection = false;
  m_bGetCurrentLocation = false;

  // Reset last coordinates
  m_geoLastCoordinates = null;
};

/**
  Timer function for street intersections
*/
function OnFollowStreetsTimer()
{
  // Set to get the intersection
  m_bGetNearestIntersection = true;

  if(m_bIntersectionWaiting
    || m_idFollowStreets == 0)
  {
    // Don't put another request in or we no longer want it.
    return;  
  }
  
  // Use current coordinates or get new ones
  GetGeoCoordinates();
};

/**
  Timer function for current address
*/
function OnFollowAddressTimer()
{
  // Set to get the address
  m_bGetCurrentLocation = true;

  if(m_bAddressWaiting
    || m_idFollowAddress == 0)
  {
    // Don't put another request in or we no longer want it.
    return;
  }
  
  // Use current coordinates or get new ones
  GetGeoCoordinates();
};

/**
  Get the bearing from one coordinate to another
  
  Formula:  θ = atan2( sin Δλ ⋅ cos φ2 , cos φ1 ⋅ sin φ2 − sin φ1 ⋅ cos φ2 ⋅ cos Δλ )
    where  φ1,λ1 is the start point, φ2,λ2 the end point (Δλ is the difference in longitude)
*/
function GetBearing(fromPosition, toPosition)
{
  if(!fromPosition || !toPosition)
  {
    return;
  }
  
  var y = Math.sin(toRadians(toPosition.coords.longitude - fromPosition.coords.longitude)) * Math.cos(toRadians(toPosition.coords.latitude)); 
  var x = Math.cos(toRadians(fromPosition.coords.latitude)) * Math.sin(toRadians(toPosition.coords.latitude)) - Math.sin(toRadians(fromPosition.coords.latitude)) *
    Math.cos(toRadians(toPosition.coords.latitude))*Math.cos(toRadians(toPosition.coords.longitude - fromPosition.coords.longitude)); 
    
  var dblBearing = Math.atan2(y, x); 
  
  return toDegrees(dblBearing);
};

/**
  Convert Radians to Degrees
*/
function toDegrees(angle) 
{ 
  return angle * (180 / Math.PI); 
};

/**
  Convert Degrees to Radians
*/
function toRadians(angle) 
{ 
  return angle * (Math.PI / 180);
};
