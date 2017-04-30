# Street-Navigation

Designed to assist people with visual impairment navigate city streets easier. 
Made originally for TOM Makeathon at Northwestern University by Daniel Bednarczyk, Darcy Green (Need Knower), Joe Cummings, Julie Davies, Megan Reid, Wong Song Wei.

Website: https://makeathon-nu.github.io/Street-Nav/

The web application takes in GPS coordinates and outputs information about the street intersection, address and direction. The outputted information would be via speech. 
Users can apply various settings: 
  •	How frequent current locations are updated (in seconds)
  •	How far should intersections be read out (in feet)
  •	How frequent new intersection information is retrieved (in seconds)
  •	Check for direction over past X seconds.

Files: 
TextToSpeech.js
  •	Turns text into audio speech
geofunctions.js
  •	Gets geolocation from phone
  •	Calls the Geonames.org API with the geolocation from the phones
index.html, index.css:
  •	Contains structure and styling of website 
index.page.js:
  •	Displays the results and allows settings to be changed 
  •	GUI functions

Notes:
•	User has to set up his/her own username before accessing the application
  ℹ	Register for a username here: http://www.geonames.org/login
•	Direction works fine now when user is moving, however it is sometimes inaccurate when user is stationary 
  ℹ	Improvements can be made when directions are calculated over distance rather than time (as it is currently done now)



