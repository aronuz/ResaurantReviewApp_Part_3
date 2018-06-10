  if ('serviceWorker' in navigator) {
    console.log('SW registering.');
    navigator.serviceWorker.register('service-worker.js').then(function() {
      console.log('SW registred.');
    }).catch(function(e){
      console.log('SW registration failed": ' + e);
    });
  } else {
    console.log('SW not supported.');
  }