var username = 'guillermo';

let saveTabs = document.getElementById('btn-saveTabs');

saveTabs.onclick = getActiveTabs;

/**
 * Prepares an array of active links and sends it to saveTabs
 */
function getActiveTabs() {
    chrome.tabs.query({
        currentWindow: true
    },(tabs) => {

        let tabsURLs = [];

        tabs.forEach(tab => {
            tabsURLs.push(tab.url);
        }); 
        
        saveActiveTabs(tabsURLs);
    });
    
}

/**
 * Saves an array of links to DB
 * @param {array} tabsURLs
 */
function saveActiveTabs(tabsURLs) {

    let http = new XMLHttpRequest();

    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status != 200) {
                alert('An error occurred while saving the data.')
            }
    }
    
    let data = {
        tabs: tabsURLs
    }

    http.open("PUT", `https://save-tabs.firebaseio.com/users/${username}.json`, true);
    http.setRequestHeader("Content-Type", "application/json");
    http.send(JSON.stringify(data));
}

