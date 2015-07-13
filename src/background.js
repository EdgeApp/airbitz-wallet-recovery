chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('src/index.html', {
      'width': 1000,
      'height': 600
  });
});
