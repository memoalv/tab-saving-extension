let saveTabs = document.getElementById('btn-saveTabs');
saveTabs.onclick = getActiveTabs;

window.onload = getUserInfo();

let user = {};

function getUserInfo() {
    chrome.identity.getProfileUserInfo(userInfo => {
        user.email = userInfo.email;
        user.id = userInfo.id;
    })
}

/**
 * Prepares an array of active links and sends it to saveActiveTabs
 */
function getActiveTabs() {
    chrome.tabs.query({
        currentWindow: true
    }, (tabs) => {
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

    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status != 200) {
            alert('An error occurred while saving the data.')
        }
    }

    console.log(tabsURLs);


    http.open("PUT", `https://save-tabs.firebaseio.com/users/${user.id}/${getMoment()}.json`, true);
    http.setRequestHeader("Content-Type", "application/json");
    http.send(JSON.stringify(tabsURLs));
}

/**
 * @returns this moments date. (yyyy-mm-dd hh:mm:ss)
 */
function getMoment() {
    let moment = new Date();

    const dd = moment.getDate();
    const mm = moment.getMonth() + 1;
    const yyyy = moment.getFullYear();

    const hh = moment.getHours();
    const min = moment.getMinutes();
    const ss = moment.getSeconds();

    moment = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`

    return moment;
}