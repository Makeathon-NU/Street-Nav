function SpeakText(strText)
{
  // Cancel prior speech
  window.speechSynthesis.cancel();
  
  // if strText is more than 200 or 300 characters, it stops speaking and canceling the speech is required.
  // http://stackoverflow.com/questions/21947730/chrome-speech-synthesis-with-longer-texts
  var speechUtterance = new SpeechSynthesisUtterance(strText);
  window.speechSynthesis.speak(speechUtterance);
};