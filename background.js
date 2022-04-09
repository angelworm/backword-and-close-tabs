browser.tabs.onCreated.addListener(onCreateTab);

function onCreateTab(tab) {
  console.log(`${tab.id}: CREATED: ${tab.url}`, tab)
    
  const callback = (tabId, changeInfo, tab) => {
    console.log(`${tabId}: UPDATED:`, changeInfo)
    
    if (!changeInfo.url || isRestrictedAboutURL(changeInfo.url)) {
      // new window or about:newtab
      // inject closer.html to next page
      console.log(`${tabId}: NEWWINDOW`)
      browser.tabs.onUpdated.removeListener(callback);
    } else if (changeInfo.url === 'about:blank') {  
      console.log(`${tabId}: NEWWINDOW`)      
    } else {
      // opens new tab with new link
      const target = changeInfo.url
      console.log(`${tabId}: MOVETO: ${target}`)
      
      browser.tabs.onUpdated.removeListener(callback);

      redirect(tabId, browser.extension.getURL('closer.html'), true).then((params) => {
        console.log(`${tabId}: INSERTED: ${JSON.stringify(params)}`)
                
        return redirect(tabId, target, false)
      }).then(({tabId, url}) => {
      	console.log(`${tabId}: ADD_DETECTOR: ${url}`)

        browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
          console.log(`${tabId}: DETECTOR_MOVED: ${changeInfo.url}`)
          if (changeInfo.url === browser.extension.getURL('closer.html')) {
            console.log(`${tabId}: DETECTOR_CLOSE`)
            browser.tabs.remove(tabId);  
          }
        }, {
          tabId: tabId,
          properties: [ 'url' ]
        })
      })
    }
  };
  
  browser.tabs.onUpdated.addListener(callback, {
    tabId: tab.id,
    properties: [ 'url' ]
  })
}

function redirect(tabId, url, inPlace) {
  return browser.tabs.update(tabId, {
    url: url,
    loadReplace: inPlace
  }).then(() => {
    console.log(`${tabId}: REDIRECTED: ${url}`)
    
    return new Promise((resolve, reject) => {
      const onLoadCallback = (tabId, changeInfo, tab) => {
        console.log(`${tabId}: WAITING_TO_COMPLETE: ${url} ${JSON.stringify(changeInfo)}`, tab)
        if (changeInfo.status === 'complete' 
            && tab.url === url) {
          browser.tabs.onUpdated.removeListener(onLoadCallback);
                 
          resolve({tabId, url});
        }
      }
      browser.tabs.onUpdated.addListener(onLoadCallback, {
        tabId: tabId,
        properties: [ 'status' ]
      });
    })
  })
}

function isRestrictedAboutURL(url) {
  return !!url
    && url.startsWith('about:')
    && ['about:blank', 'about:home'].indexOf(url) < 0
}
