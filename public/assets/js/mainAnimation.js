let userName = localStorage.getItem("name");
let backgroundURL = localStorage.getItem("backgroundURL");
const dbName = "WebsiteSettingsDB";
const storeName = "backgrounds";
const KEY = "userBackground";
if (backgroundURL == null) {
  localStorage.setItem("backgroundURL", "/assets/img/bg3.png");
  backgroundURL = localStorage.getItem("backgroundURL");
}
async function useStore(mode, cb) {
  const db = await openWebsiteDB();
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = cb(store);
    tx.oncomplete = () => resolve(req.result);
  });
}
function openWebsiteDB() {
  return new Promise((resolve) => {
    const req = indexedDB.open(dbName, 1);

    req.onupgradeneeded = () => req.result.createObjectStore(storeName);

    req.onsuccess = () => resolve(req.result);
  });
}

async function setBackground(fileBlob) {
  await useStore("readwrite", (s) => s.put(fileBlob, "userBackground"));
  await applyBackgroundFromDB();
}

async function applyBackgroundFromDB() {
  const blob = await useStore("readonly", (s) => s.get("userBackground"));
  if (blob) {
    const url = URL.createObjectURL(blob);
    console.log("UPLOADED URL: " + url);
    localStorage.setItem("backgroundURL", url);
    document.documentElement.style.setProperty(
      "--backgroundURL",
      `url(${url})`,
    );
  }
}

(async () => {
  if (backgroundURL.startsWith("blob")) {
    await applyBackgroundFromDB();
  } else {
    document.documentElement.style.setProperty(
      "--backgroundURL",
      `url(${backgroundURL})`,
    );
  }
})();

gsap.fromTo(
  ".navStagger",
  { y: 50, opacity: 0 },
  { duration: 0.4, y: 0, opacity: 1, stagger: 0.05 },
);

document.querySelector(".userName").textContent = userName;

let zindex = 0;
let spawnOffset = 0;
const offsetIncrement = 30;
const maxOffset = 300;
function openWindow(
  windowPosition,
  windowSrc,
  windowLeft,
  windowTop,
  windowHeight,
  windowWidth,
  windowType,
) {
  const snapLeft = document.getElementById("snap-left");
  const snapRight = document.getElementById("snap-right");
  let snapTarget = null;
  windowType = windowType || "iframe";
  console.log(windowType);
  const windowEl = document.createElement("div");
  const iframe = document.createElement(windowType);
  let windowValue = "1";
  windowEl.className = "window";
  windowEl.style.position = "absolute";
  windowEl.style.height = windowHeight || "45%";
  windowEl.style.width = windowWidth || "45%";
  windowEl.style.zIndex = ++zindex;
  windowEl.style.transition = "opacity 0.3s ease";
  if (!windowLeft && !windowTop) {
    windowEl.style.left = `calc(19% + ${spawnOffset}px)`;
    windowEl.style.top = `calc(19% + ${spawnOffset}px)`;
    spawnOffset += offsetIncrement;
    if (spawnOffset > maxOffset) {
      spawnOffset = 0;
    }
    windowPosition = windowPosition;
  } else if (windowPosition == "left") {
    windowEl.style.left = windowLeft || "19%";
    windowEl.style.top = windowTop || "19%";
  } else if (windowPosition == "right") {
    windowEl.style.right = windowLeft || "19%";
    windowEl.style.top = windowTop || "19%";
  }

  windowEl.innerHTML = `
    <div class="windowTop">

      <div class="windowMove">
                    </div>

      <div class="windowControls">
        <div class="minimize windowcontrolicon">
          <img src="assets/img/icons/minimize-sign.png" class="windowIcons" />
        </div>
        <div class="square windowcontrolicon">
          <img src="assets/img/icons/stop.png" class="windowIcons" id="square" />
          <img src="assets/img/icons/layers.png" class="windowIcons" id="squares" />
        </div>
        <div class="closeIcon windowcontrolicon windowcontroliconred">
          <img src="assets/img/icons/close.png" class="windowIcons" />
        </div>
      </div>
    </div>
    
    <div class="window-overlay"></div> 

    <div class="resize-handle resize-top-left"></div>
    <div class="resize-handle resize-top-right"></div>
    <div class="resize-handle resize-bottom-left"></div>
    <div class="resize-handle resize-bottom-right"></div>

    <div class="resize-handle resize-top"></div>
    <div class="resize-handle resize-right"></div>
    <div class="resize-handle resize-bottom"></div>
    <div class="resize-handle resize-left"></div>
  `;

  const squareBtn = windowEl.querySelector(".square");
  const closeBtn = windowEl.querySelector(".closeIcon");
  const minimizeBtn = windowEl.querySelector(".minimize");

  const overlay = windowEl.querySelector(".window-overlay");

  function focusCurrentWindow() {
    windowEl.style.zIndex = ++zindex;

    const allWindows = document.querySelectorAll(".window");

    allWindows.forEach((win) => {
      const winOverlay = win.querySelector(".window-overlay");
      if (winOverlay) {
        if (win === windowEl) {
          winOverlay.style.display = "none";
        } else {
          winOverlay.style.display = "block";
        }
      }
    });
  }

  overlay.addEventListener("mousedown", (e) => {
    focusCurrentWindow();
  });

  focusCurrentWindow();

  squareBtn.addEventListener("click", changeIcon);
  closeBtn.addEventListener("click", closeWindow);
  minimizeBtn.addEventListener("click", minimizeWindow);

  iframe.className = "windowFrame";
  iframe.src = windowSrc;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";

  windowEl.appendChild(iframe);
  document.body.appendChild(windowEl);

  windowEl.style.transform = "scale(0.8)";
  windowEl.style.transition = "opacity 0.25s ease, transform 0.25s ease";
  requestAnimationFrame(() => {
    windowEl.style.transform = "scale(1)";
    windowEl.style.opacity = "1";
  });

  const controls = windowEl.querySelector(".windowMove");
  const handles = windowEl.querySelectorAll(".resize-handle");

  controls.addEventListener("dblclick", () => {
    changeIcon();
  });

  let isDragging = false;
  let isResizing = false;
  let currentHandle = null;

  let startX, startY, startW, startH, startL, startT;

  let offset = { x: 0, y: 0 };
  const allIframes = document.querySelectorAll(".windowFrame");

  const navBar = document.querySelector(".nav");
  const navBarHeight = navBar ? navBar.offsetHeight : 0;

  controls.addEventListener("mousedown", (e) => {
    focusCurrentWindow();

    windowEl.style.transition = "0s";
    if (windowEl.classList.contains("snapped")) {
      console.log("restoring");
      windowEl.classList.remove("snapped");
      windowEl.style.width = "45%";
      windowEl.style.height = "45%";
      allIframes.forEach((f) => (f.style.pointerEvents = "none"));
      windowEl.style.transition = "0s";
      windowEl.style.top = "0px";
      isDragging = true;
      offset.x = e.clientX - windowEl.offsetLeft;
      offset.y = e.clientY - windowEl.offsetTop;
    } else if (windowEl.style.width == "99.999%") {
      windowValue = 0;
      changeIcon();
      allIframes.forEach((f) => (f.style.pointerEvents = "none"));
      windowEl.style.transition = "0s";
      windowEl.style.top = "0px";
      isDragging = true;
      offset.x = e.clientX - windowEl.offsetLeft;
      offset.y = e.clientY - windowEl.offsetTop;
    } else if (windowValue === "1") {
      allIframes.forEach((f) => (f.style.pointerEvents = "none"));
      isDragging = true;
      offset.x = e.clientX - windowEl.offsetLeft;
      offset.y = e.clientY - windowEl.offsetTop;
    } else if (windowValue === "0") {
      changeIcon();
      console.log("ChangeICON");
      allIframes.forEach((f) => (f.style.pointerEvents = "none"));
      windowEl.style.transition = "0s";
      windowEl.style.top = "0px";
      isDragging = true;
      offset.x = e.clientX - windowEl.offsetLeft;
      offset.y = e.clientY - windowEl.offsetTop;
    }
  });

  handles.forEach((handle) => {
    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      focusCurrentWindow();
      isResizing = true;
      currentHandle = handle;

      startX = e.clientX;
      startY = e.clientY;

      const rect = windowEl.getBoundingClientRect();
      startW = rect.width;
      startH = rect.height;
      startL = windowEl.offsetLeft;
      startT = windowEl.offsetTop;

      allIframes.forEach((f) => (f.style.pointerEvents = "none"));
      windowEl.style.transition = "0s";
    });
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      let newX = e.clientX - offset.x;
      let newY = e.clientY - offset.y;

      const maxX = window.innerWidth - windowEl.offsetWidth;
      const maxY = window.innerHeight - navBarHeight - windowEl.offsetHeight;

      windowEl.style.left = Math.max(0, Math.min(newX, maxX)) + "px";
      windowEl.style.top = Math.max(30, Math.min(newY, maxY)) + "px";

      const snapMargin = 100;
      snapTarget = null;

      if (e.clientX < snapMargin) {
        snapLeft.classList.add("snap-active");
        snapRight.classList.remove("snap-active");
        snapTarget = "left";
      } else if (e.clientX > window.innerWidth - snapMargin) {
        snapRight.classList.add("snap-active");
        snapLeft.classList.remove("snap-active");
        snapTarget = "right";
      } else {
        snapLeft.classList.remove("snap-active");
        snapRight.classList.remove("snap-active");
      }
    }

    if (isResizing) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const minW = 200;
      const minH = 150;

      if (
        currentHandle.classList.contains("resize-right") ||
        currentHandle.classList.contains("resize-top-right") ||
        currentHandle.classList.contains("resize-bottom-right")
      ) {
        let newW = startW + dx;
        const maxW = window.innerWidth - startL;
        newW = Math.max(minW, Math.min(newW, maxW));
        windowEl.style.width = newW + "px";
      }
      if (
        currentHandle.classList.contains("resize-bottom") ||
        currentHandle.classList.contains("resize-bottom-left") ||
        currentHandle.classList.contains("resize-bottom-right")
      ) {
        let newH = startH + dy;

        const maxBottom = window.innerHeight - navBarHeight - startT;

        newH = Math.max(minH, Math.min(newH, maxBottom));

        windowEl.style.height = newH + "px";
      }

      if (
        currentHandle.classList.contains("resize-left") ||
        currentHandle.classList.contains("resize-top-left") ||
        currentHandle.classList.contains("resize-bottom-left")
      ) {
        let newL = startL + dx;
        let newW = startW - dx;

        if (newL < 0) {
          newL = 0;
          newW = startL + startW;
        }

        if (newW < minW) {
          newW = minW;
          newL = startL + startW - minW;
        }

        windowEl.style.left = newL + "px";
        windowEl.style.width = newW + "px";
      }

      if (
        currentHandle.classList.contains("resize-top") ||
        currentHandle.classList.contains("resize-top-left") ||
        currentHandle.classList.contains("resize-top-right")
      ) {
        let newT = startT + dy;
        let newH = startH - dy;

        if (newT < 30) {
          newT = 30;
          newH = startH + startT;
        }

        if (newH < minH) {
          newH = minH;
          newT = startT + startH - minH;
        }

        windowEl.style.top = newT + "px";
        windowEl.style.height = newH + "px";
      }
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    isResizing = false;
    if (snapTarget === "left") {
      windowEl.classList.add("snapped");
      snapLeft.classList.remove("snap-active");
      windowEl.style.transition = "all 0.25s ease";
      windowEl.style.left = "0px";
      windowEl.style.top = "0px";
      windowEl.style.width = "50vw";
      windowEl.style.height = "calc(100% - 52px)";
    } else if (snapTarget === "right") {
      windowEl.classList.add("snapped");
      snapRight.classList.remove("snap-active");
      windowEl.style.transition = "all 0.25s ease";
      windowEl.style.left = "50vw";
      windowEl.style.top = "0px";
      windowEl.style.width = "50vw";
      windowEl.style.height = "calc(100% - 52px)";
    }
    snapTarget = null;
    snapLeft.classList.remove("snap-active");
    snapRight.classList.remove("snap-active");

    allIframes.forEach((f) => (f.style.pointerEvents = "auto"));
  });

  let square = windowEl.querySelector("#square");
  let squares = windowEl.querySelector("#squares");

  function changeIcon() {
    windowEl.style.transition =
      "width 0.3s ease, height 0.3s ease, left 0.3s ease, top 0.3s ease";

    if (windowValue === "1") {
      square.style.display = "none";
      squares.style.display = "flex";
      windowValue = "0";

      windowEl.style.left = "0px";
      windowEl.style.top = "0px";
      windowEl.style.width = "100%";
      windowEl.style.height = "calc(100% - 51px)";
    } else {
      squares.style.display = "none";
      square.style.display = "flex";
      windowValue = "1";

      windowEl.style.left = "500px";
      windowEl.style.top = "200px";
      windowEl.style.width = "45%";
      windowEl.style.height = "45%";
    }
  }

  function closeWindow() {
    windowEl.style.animation = "closeWindow 0.2s ease forwards";
    windowEl.addEventListener("animationend", () => {
      windowEl.remove();
    });
  }

  function minimizeWindow() {
    const minimizedContainer = document.getElementById("minimizedContainer");
    const icon = document.createElement("div");
    icon.className = "minimizedWindowIcon";
    minimizedContainer.appendChild(icon);

    const savedLeft = windowEl.style.left;
    const savedTop = windowEl.style.top;
    const savedWidth = windowEl.style.width;
    const savedHeight = windowEl.style.height;

    const rect = icon.getBoundingClientRect();

    windowEl.style.transition = "all 0.3s ease";
    windowEl.style.width = rect.width + "px";
    windowEl.style.height = rect.height + "px";
    windowEl.style.left = rect.left + "px";
    windowEl.style.top = rect.top + "px";
    windowEl.style.opacity = "0";

    const preview = document.createElement("div");
    preview.className = "minimizedPreview";
    preview.innerHTML = windowEl.innerHTML;
    document.body.appendChild(preview);

    icon.addEventListener("mouseenter", (e) => {
      preview.style.left = e.clientX + "px";
      preview.style.top = e.clientY - preview.offsetHeight - 10 + "px";
      preview.style.opacity = "1";
      preview.style.zIndex = 10000;
    });

    icon.addEventListener("mousemove", (e) => {
      preview.style.left = e.clientX + "px";
      preview.style.top = e.clientY - preview.offsetHeight - 10 + "px";
    });

    icon.addEventListener("mouseleave", () => {
      preview.style.opacity = "0";
      preview.style.zIndex = -1999;
    });

    icon.addEventListener("click", () => {
      windowEl.style.transition = "all 0.3s ease";

      windowEl.style.width = savedWidth;
      windowEl.style.height = savedHeight;
      windowEl.style.left = savedLeft;
      windowEl.style.top = savedTop;

      windowEl.style.opacity = "1";

      focusCurrentWindow();

      icon.remove();
      preview.remove();
    });
  }
}
const currentSiteUrl = window.location.hostname + "x.html";
function launchBlob() {
  const htmlContent = `
    <html>
      <head>
            <title>Classroom</title>
            <link rel="icon" type="image/x-icon" href="https://ssl.gstatic.com/classroom/favicon.png">
        <style>
          body,
          html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #000;
          }
          iframe {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
          }
        </style>
      </head>
      <body>
        <iframe src="${currentSiteUrl}"></iframe>
      </body>
    </html>
	`;

  const blob = new Blob([htmlContent], {
    type: "text/html",
  });

  const blobUrl = URL.createObjectURL(blob);

  let newWindow = window.open(blobUrl);
}

function aboutBlank() {
  var y = window.open("about:blank#", "_blank");
  y.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
            <title>Classroom</title>
            <link rel="icon" type="image/x-icon" href="https://ssl.gstatic.com/classroom/favicon.png">
        </head>
        <body>
        <iframe src="${currentSiteUrl}"></iframe>
        </body>
        <style>
    body,iframe {
    background: #000;

    height: 100vh;
    width: 100vw;
    overflow: hidden;
    border: 0px;
    margin: 0px;
    }
    </style>
      </html>
    `);
  y.document.close();
}

const dock = document.querySelector(".nav");
let icons = [];

let mouseX = null;

icons.forEach((icon) => {
  icon._scale = 1;
  icon._targetScale = 1;
});

dock.addEventListener("mousemove", (e) => {
  const rect = dock.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
});

dock.addEventListener("mouseleave", () => {
  mouseX = null;
});

function softFalloff(t) {
  return t * t * (3 - 2 * t);
}

function imacEffect() {
  requestAnimationFrame(imacEffect);
  const dockRect = dock.getBoundingClientRect();

  const currentIcons = document.querySelectorAll(".icons");

  currentIcons.forEach((icon) => {
    if (icon._scale === undefined) {
      icon._scale = 1;
      icon._targetScale = 1;
    }

    const iconRect = icon.getBoundingClientRect();
    const iconCenter = iconRect.left - dockRect.left + iconRect.width / 2;

    let distance = mouseX === null ? 9999 : Math.abs(mouseX - iconCenter);

    const minScale = 1;
    const maxScale = 1.8;
    const range = 90;

    let influence = Math.max(0, 1 - distance / range);
    influence = softFalloff(influence);

    icon._targetScale = minScale + (maxScale - minScale) * influence;

    const stiffness = 0.15;
    const damping = 0.12;

    const delta = icon._targetScale - icon._scale;
    icon._scale += delta * stiffness;

    icon.style.transform = `scale(${icon._scale})`;
  });
}
updateTime();
imacEffect();
function updateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  document.getElementById("timeDisplay").textContent = timeString;
}
setInterval(updateTime, 1000);
function auto() {
  if (localStorage.getItem("autoBlob") === "true") {
    launchBlob();
  }

  if (localStorage.getItem("autoAbout") === "true") {
    aboutBlank();
    location.replace(
      "https://lightingshovestature.com/tq5s28ueku?key=787c4f20eb8c6e759c73a4963748ab1c",
    );
  }
}
const nav = document.getElementById("nav");
const menu = document.getElementById("options");
let counter = 0;
let mouseXpos = null;

document.addEventListener("mousemove", (event) => {
  mouseXpos = event.clientX;
  if (counter == 0) {
    menu.style.left = mouseXpos + "px";
  }
});

document.addEventListener("click", () => {
  if (counter == 1) {
    menu.style.bottom = "-40px";
    menu.style.opacity = "0";
    menu.style.zIndex = "-10000000";
    counter = 0;
    menu.style.transitionDuration = "0s";
  }
});

nav.addEventListener("contextmenu", (e) => {
  menu.style.transitionDuration = "0s";
  e.preventDefault();
  counter = counter === 0 ? 1 : 0;

  if (counter == 1) {
    menu.style.transitionDuration = "0.3s";
    menu.style.bottom = "50px";
    menu.style.opacity = "1";
    menu.style.zIndex = "10000000";
  } else {
    menu.style.bottom = "0px";
    menu.style.opacity = "0";
    menu.style.zIndex = "-10000000";
  }
});

let appCounter = parseInt(localStorage.getItem("appCounter")) || 0;
let savedApps = JSON.parse(localStorage.getItem("customApps")) || [];

window.onload = () => {
  savedApps.forEach((app) => {
    makeapp(app.id, app.name, app.url, app.icon);
  });
};

function submitApp() {
  const name = document.getElementById("appName").value;
  const icon = document.getElementById("appIcon").value;
  const url = document.getElementById("appUrl").value;

  if (name && url) {
    closeModal();
    addapp(name, url, icon);
  } else {
    alert("Please fill in the Name and URL!");
  }
}

function addapp(name, url, icon) {
  appCounter++;
  const appId = "custom" + appCounter;

  const newApp = {
    id: appId,
    name: name,
    url: url,
    icon: icon || "assets/img/icons/custom.png",
  };

  savedApps.push(newApp);
  localStorage.setItem("customApps", JSON.stringify(savedApps));
  localStorage.setItem("appCounter", appCounter.toString());

  makeapp(appId, name, url, newApp.icon);
}

function makeapp(id, name, url, icon) {
  let appDiv = document.createElement("div");
  appDiv.className = "navItems navStagger";
  appDiv.id = id;
  appDiv.onclick = function () {
    if (typeof openWindow === "function") {
      openWindow("", "app.html", "", "", "", "");
    }
    localStorage.setItem("storeAppURL", url);
    localStorage.setItem("tempProxy", "SJ");
  };
  appDiv.oncontextmenu = function (e) {
    e.preventDefault();
    e.stopPropagation();

    const confirmDelete = confirm(`Do you want to delete "${name}"?`);

    if (confirmDelete) {
      deleteApp(id);
    }
  };

  appDiv.innerHTML = `<img title="${name}" src="${icon}" class="icons" />`;
  nav.appendChild(appDiv);
  appDiv.style.opacity = "1";
}
function showApp() {
  document.getElementById("appModal").style.opacity = "1";
  document.getElementById("appModal").style.zIndex = "10000000";
  document.getElementById("modal-content").style.transform = "scale(1)";
}

function closeModal() {
  document.getElementById("appModal").style.opacity = "0";
  document.getElementById("appModal").style.zIndex = "-10000000";
  document.getElementById("modal-content").style.transform = "scale(0.1)";
}
function deleteApp(id) {
  const element = document.getElementById(id);
  if (element) element.remove();
  savedApps = savedApps.filter((app) => app.id !== id);
  localStorage.setItem("customApps", JSON.stringify(savedApps));
}
const latestVersion = "6.8";
const storedVersion = localStorage.getItem("galaxyVersion");
function update() {
  let updateDiv = document.getElementById("update");
  updateDiv.style.display = "flex";
  localStorage.setItem("galaxyVersion", 0);
}

function checkVersion() {
  console.log("Checking version...");
  if (storedVersion == null || storedVersion == 0) {
    openWindow("left", "updates.html", "0px", "35px", "60%", "30%");
    console.log("Setting version to latest");

    localStorage.setItem("galaxyVersion", latestVersion);
  } else if (storedVersion !== latestVersion) {
    update();
  } else {
    auto();
  }
}

checkVersion()