# Street-Navigation

Helps visually impaired users to navigate city streets. Announces intersections while walking.

Made originally for TOM Makeathon at Northwestern University by Daniel Bednarczyk, Darcy Green (Need Knower), Joe Cummings, Julie Davies, Megan Reid, Wong Song Wei.

MIT License

Powered by geonames.org under a cc by license.
geonames.org geocoder for outside the United States is using google geocoder, reverse geocoding is provided by geonames using openstreemap data (Feb 2014) under a cc by-sa license.

**Website: https://makeathon-nu.github.io/Street-Nav/**

The web application uses a devices GPS coordinates and displays the street intersection, address and direction.  When the user is within a certain distance of the intersection, the intersection is spoken by the device.  When the location button is pressed, the nearest found address is spoken.

Users can apply various settings: 
* Outside of the United States.  Addresses are only available in the United States, Intersections work everywhere.
* Frequency current location is updated (in seconds).
* Distance to intersection for spoken intersection (in feet).
*	Frequency new intersection is updated (in seconds).
*	Check for direction over time (in seconds).

If the address or intersection aren't working:
*  Be sure that the username is entered correctly, capitalization matters.
*  GPS must be enabled for the app or web browser on the device.
*  Try clearing the cache for the web browser.
*  Allow the browser to know your location.

If text to speech isn't working:
 *  Turn the ringer on and the volume up. iOS needs the ringer on for text to speech.

Files: 
* TextToSpeech.js
  * Turns text into audio speech
* geofunctions.js
  *	Gets geolocation from device
  *	Calls the Geonames.org API with the geolocation from the device
* index.html, index.css:
  * Contains structure and styling of website 
* index.page.js:
  * Displays the results and allows settings to be changed 
  * GUI functions

Notes:
* User has to set up his/her own username before accessing the application
  * ℹ	Register for a username here: http://www.geonames.org/login
* Direction works fine while the user is moving, however it is sometimes incorrect when the user is stationary 
  * ℹ	Improvements can be made when direction is calculated over distance rather than time
* When an android or iphone app are created and point to this website, it is possible for the device to continue speaking the intersections when the phone is asleep.  The phone could be in your pocket with headphones connected.

Hopefully it helps! :) 


