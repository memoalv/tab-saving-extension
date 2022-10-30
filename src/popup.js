//TODO: reorganize dis ugly code

window.onload = getSessions;

function getSessions() {
  chrome.storage.sync.get(["sessions"], sessionsLS => {
    const collapsible = document.getElementById("collapsible");
    if (collapsible) collapsible.remove();

    // if theres no data stored on LS
    if (Object.entries(sessionsLS).length === 0 && sessionsLS.constructor === Object) {
      showNoDataMsg();
    }
    // if there is, a collapsible will be created for each session
    else {
      hideNoDataMsg();
      addCollapsibles(sessionsLS.sessions);
    }
    hideLoader();
  });
}

let saveTabs_btn = document.getElementById("btn-saveTabs");
saveTabs_btn.onclick = showNameForm;

/**
 * Prepares an array of active links and sends it to saveActiveTabs
 */
function getActiveTabs(e) {
  if (e.type == 'click' || e.keyCode == 13) {
    showLoader();
    chrome.tabs.query(
      {
        currentWindow: true,
      },
      tabs => {
        let tabsURLs = [];

        tabs.forEach(tab => {
          tabsURLs.push(tab.url);
        });

        saveActiveTabs(tabsURLs);
      }
    );
  }
}

/**
 * Saves an array of links to Local storage
 * @param {array} tabsURLs
 */
function saveActiveTabs(tabsURLs) {
  chrome.storage.sync.get(["sessions"], sessionsLS => {
    // si no hay nada en LS se creara un nuevo arreglo para guardar sesiones
    if (Object.entries(sessionsLS).length === 0 && sessionsLS.constructor === Object) {
      const newSessionsObj = {
        sessions: [],
      };
      newSessionsObj.sessions.push(getSessionData(tabsURLs));

      chrome.storage.sync.set(newSessionsObj, () => {
        getSessions();
        //TODO: mostrar mensaje de guardado, usar un toast de materialize
      });
    }
    // si ya existe el arreglo sesiones solo se empujara un nuevo
    else {
      sessionsLS.sessions.push(getSessionData(tabsURLs));

      chrome.storage.sync.set(sessionsLS, () => {
        getSessions();
        //TODO: mostrar mensaje de guardado
      });
    }

    hideNameForm();
  });
}

const sessionNameField = document.getElementById("session-name");
sessionNameField.onkeyup = getActiveTabs;
/**
 * Return the current session object
 * @param {array} tabs
 * Current active tabs
 */
function getSessionData(tabs) {
  const sessionName = sessionNameField.value;
  sessionNameField.value = "";

  const sessionData = {
    timeStamp: getMoment(),
    tabs: tabs,
  };

  sessionName ? (sessionData.name = sessionName) : (sessionData.name = sessionData.timeStamp);

  return sessionData;
}

const nameForm = document.getElementById("name-form");
function showNameForm() {
  saveTabs_btn.classList.add("scale-out");
  setTimeout(() => {
    saveTabs_btn.classList.add("hide");
    nameForm.classList.remove("hide");
    nameForm.classList.remove("scale-out");
    document.getElementById("session-name").focus();
  }, 201);
}

function hideNameForm() {
  nameForm.classList.add("scale-out");
  setTimeout(() => {
    nameForm.classList.add("hide");
    saveTabs_btn.classList.remove("hide");
    saveTabs_btn.classList.remove("scale-out");
  }, 201);
}

const saveBtn = document.getElementById("btn-save");
saveBtn.onclick = getActiveTabs;

/**
 * Add the collapsibles based on the stored session data
 */
function addCollapsibles(sessions) {
  const ul = document.createElement("ul");
  ul.setAttribute("id", "collapsible");
  ul.setAttribute("class", "collapsible");

  sessions.forEach((session, i) => {
    const li = document.createElement("li");
    const header = document.createElement("div");
    header.setAttribute("class", "collapsible-header");

    const headerText = document.createTextNode(session.name);
    header.appendChild(headerText);

    const spacer = document.createElement("div");
    spacer.setAttribute("class", "spacer");

    header.appendChild(spacer);

    const restoreBtn = document.createElement("button");
    restoreBtn.setAttribute("class", "btn-flat");
    restoreBtn.classList.add("restore-btn");
    restoreBtn.onclick = () => {
      restoreTabs(`${i}`);
    };

    const restoreBtnText = document.createTextNode("Restore");
    restoreBtn.appendChild(restoreBtnText);

    header.appendChild(restoreBtn);

    const icon = document.createElement("i");
    icon.setAttribute("class", "small");
    icon.classList.add("material-icons", "delete-icon");
    icon.onclick = () => {
      deleteSession(`${i}`);
    };

    const iconText = document.createTextNode("delete");
    icon.appendChild(iconText);

    header.appendChild(icon);

    li.appendChild(header);

    const body = document.createElement("div");
    body.setAttribute("class", "collapsible-body");

    // create links for each previously saved tab
    session.tabs.forEach(tab => {
      const a = document.createElement("a");
      a.setAttribute("target", "_blank");
      a.setAttribute("href", tab);
      a.setAttribute("class", "truncate");
      a.classList.add("link");

      const aText = document.createTextNode(tab);

      a.appendChild(aText);

      body.appendChild(a);
    });

    li.appendChild(body);
    ul.appendChild(li);
  });

  const dataContainer = document.getElementById("data-container");
  dataContainer.appendChild(ul);

  M.AutoInit();
}

function restoreTabs(i) {
  showLoader();
  chrome.storage.sync.get(["sessions"], sessionsLS => {
    const tabsToRestore = sessionsLS.sessions[i].tabs;

    chrome.windows.create({
      url: tabsToRestore,
      focused: true,
    });

    hideLoader();
  });
}

function deleteSession(i) {
  showLoader();
  chrome.storage.sync.get(["sessions"], sessionsLS => {
    const sessions = sessionsLS.sessions;
    sessions.splice(i, 1);

    if (sessions.length > 0) {
      chrome.storage.sync.set(sessionsLS, () => {
        //TODO: mostrar mensaje de guardado
        getSessions();
      });
    } else {
      chrome.storage.sync.clear(() => {
        getSessions();
      });
    }
  });
}

/**
 * Loader functions
 * Hide and show the loading bar
 */
function hideLoader() {
  document.getElementById("loading-bar").classList.add("hide");
}

function showLoader() {
  document.getElementById("loading-bar").classList.remove("hide");
}

/**
 * No data message functions
 * Hide and show the message
 */
function hideNoDataMsg() {
  document.getElementById("no-data-msg").classList.add("hide");
}
function showNoDataMsg() {
  document.getElementById("no-data-msg").classList.remove("hide");
}

/**
 * Get this moment's timestamp
 * @returns this moment's timestamp. (yyyy-mm-dd hh:mm:ss)
 */
const getMoment = () => {
  let now = new Date();

  const dd = now.getDate();
  const mm = now.getMonth() + 1;
  const yyyy = now.getFullYear();

  const hh = now.getHours();
  const min = now.getMinutes();
  const ss = now.getSeconds();

  now = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;

  return now;
};
