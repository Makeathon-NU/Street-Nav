/**
 * TextToSpeech.js
 * Contains functions for text to speech.
 *
 * Made for TOM Makeathon at Northwestern University
 *
 * @license MIT license
 * @version 1.0
 * @author  Daniel Bednarczyk, Darcy Green (Need Knower), Joe Cummings, Julie Davies, Megan Reid, Wong Song Wei
 * @updated 2017-05-16
 * @link    https://makeathon-nu.github.io/Street-Nav/
 *
 * If text to speech isn't working:
 *  Turn the ringer on. iOS needs the ringer on for text to speech.
 *  
 */

function SpeakText(strText)
{
  // Cancel prior speech
  window.speechSynthesis.cancel();
  
  // if strText is more than 200 or 300 characters, it stops speaking and canceling the speech is required.
  // http://stackoverflow.com/questions/21947730/chrome-speech-synthesis-with-longer-texts
  var speechUtterance = new SpeechSynthesisUtterance(strText);
  window.speechSynthesis.speak(speechUtterance);
};
