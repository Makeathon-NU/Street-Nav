// Id returned by setTimeout to regularly check for intersections.
var m_idFollowStreets = 0;

// Id returned by setTimeout to regularly check for addresses.
var m_idFollowAddress = 0;

// Username to use for geonames.org
var m_strUsername = "";

// Waiting for Geo Coordinates, one request is outstanding if true.
// Don't want more than one outstanding call to it.
var m_bCoordWaiting = false;

// Granularity for requesting coordinates when following streets in milliseconds.
// Defaults to the minimum of 1.8 seconds.  geonames.org allows 2000 credits an hour.
var m_iIntersectionFrequencyMs = 3000;

// Granularity for requesting coordinates when following address in milliseconds.
var m_iAddrFrequencyMs = 10000;

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
  if (navigator.geolocation) 
  {
    var date = new Date();
    
    if(m_geoLastCoordinates
      && m_geoLastCoordinates.coords.latitude != 0
      && m_geoLastCoordinates.coords.longitude != 0
      && date.getTime() - m_geoLastCoordinates.timestamp <= 10000)
    {
      OnUseCurrentPosition(m_geoLastCoordinates);
    }
  
    navigator.geolocation.getCurrentPosition(successGetCurrentPosition, errorGetCurrentPosition, {maximumAge: 20000, timeout:5000, enableHighAccuracy: true});
  }
  else 
  { 
    alert("Geolocation is not supported by this browser.");
  }
}

function successGetCurrentPosition(position)
{
  OnUseCurrentPosition(position);
};

function errorGetCurrentPositionLessAccurate(positionError)
{
  if(positionError.code == 3
    && m_bGetCurrentLocation)
  {
    // Keep trying to get the location.
//    GetCurrentLocation();
  }
  
  OnGetCurrentPositionError(positionError);
};

function errorGetCurrentPositionAccurate(positionError)
{
  // Try the less accurate getCurrentPosition.
  navigator.geolocation.getCurrentPosition(successGetCurrentPosition, errorGetCurrentPositionLessAccurate, {maximumAge: 20000, timeout:5000, enableHighAccuracy: false});
}

function successWatchPosition(position)
{
  m_geoLastCoordinates = position;

  OnUseCurrentPosition(m_geoLastCoordinates);
};

function errorWatchPosition(positionError)
{
  if(m_idWatchPosition != 0)
  {
    navigator.geolocation.clearWatch(m_idWatchPosition);
    m_idWatchPosition = navigator.geolocataion.watchPosition(successWatchPosition, errorWatchPosition, {maximumAge: 20000, timeout:10000, enableHighAccuracy: true});
  }

  OnWatchPositionError(positionError);
};

function OnUseCurrentPosition(position)
{
  if(m_bGetCurrentLocation)
  {
    GetCurrentLocation(position.coords.latitude, position.coords.longitude);
    m_bGetCurrentLocation = false;
  } 
  if(m_bGetNearestIntersection)
  {
    GetNearestIntersection(position.coords.latitude, position.coords.longitude);
    m_bGetNearestIntersection = false;
  }
      
  OnGetGeoCoordinates(position);
};

/*
  Create OnGetCurrentLocation(response) to receive the response and act on it.
*/
function GetCurrentLocation(dblLatitude, dblLongitude)
{
  if(arguments.length == 0
    || (dblLatitude == 0 && dblLongitude == 0))
  {
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
      m_bCoordWaiting = false;
    }
    
    OnGetCurrentLocation(this);
  };

  m_bCoordWaiting = true;
  xhttp.open("GET", "https://secure.geonames.org/findNearestAddressJSON?lat=" + dblLatitude.toString() + "&lng=" + dblLongitude.toString() + "&username=" + m_strUsername, true);
  xhttp.send();
};

/*
  Create OnGetNearestIntersection(response) to receive the response and act on it.
*/
function GetNearestIntersection(dblLatitude, dblLongitude)
{
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() 
  {
    OnGetNearestIntersection(this);
  };

  xhttp.open("GET", "https://secure.geonames.org/findNearestIntersectionJSON?lat=" + dblLatitude.toString() + "&lng=" + dblLongitude.toString() + "&username=" + m_strUsername, true);
  xhttp.send();
};

function StartFollowingStreets()
{
  if(m_idFollowStreets != 0)
  {
    return;
  }
  
  m_idFollowStreets = setInterval(OnFollowStreetsTimer, m_iIntersectionFrequencyMs);
  
  if(m_iAddrFrequencyMs != 0)
  {
    m_idFollowAddress = setInterval(OnFollowAddressTimer, m_iAddrFrequencyMs);
  }
  
  if(m_idWatchPosition == 0)
  {
    m_idWatchPosition = navigator.geolocation.watchPosition(successWatchPosition, errorWatchPosition, {maximumAge: 20000, timeout:10000, enableHighAccuracy: true});
  }

  if(m_iAddrFrequencyMs != 0)
  {  
    m_bGetCurrentLocation = true;
  }
    
  m_bGetNearestIntersection = true;
  GetGeoCoordinates();
};

function StopFollowingStreets()
{
  clearTimeout(m_idFollowStreets);
  clearTimeout(m_idFollowAddress);
  navigator.geolocation.clearWatch(m_idWatchPosition);
  
  m_idFollowStreets = 0;
  m_idFollowAddress = 0;
  m_idWatchPosition = 0;
  m_bGetNearestIntersection = false;
  m_bGetCurrentLocation = false;

  m_geoLastCoordinates = null;
};

function OnFollowStreetsTimer()
{
  m_bGetNearestIntersection = true;

  if(m_bCoordWaiting
    || m_idFollowStreets == 0)
  {
    // Don't put another request in or we no longer want it.
    return;  
  }
  
  GetGeoCoordinates();
};

function OnFollowAddressTimer()
{
  m_bGetCurrentLocation = true;

  if(m_bCoordWaiting
    || m_idFollowAddress == 0)
  {
    // Don't put another request in or we no longer want it.
    // Make sure we use the next coordinates we get.
    return;
  }
  
  GetGeoCoordinates();
};

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

function toDegrees (angle) 
{ 
  return angle * (180 / Math.PI); 
};

function toRadians (angle) 
{ 
  return angle * (Math.PI / 180);
};

function bearing(la1, lo1, la2, lo2)
{
  var y = Math.sin(toRadians(lo2-lo1)) * Math.cos(toRadians(la2)); 
  var x = Math.cos(toRadians(la1)) * Math.sin(toRadians(la2)) - Math.sin(toRadians(la1)) *
  Math.cos(toRadians(la2))*Math.cos(toRadians(lo2-lo1)); 
  var brng = Math.atan2(y, x); 
  brng = brng * 180 / Math.PI; 
  return brng;
};
