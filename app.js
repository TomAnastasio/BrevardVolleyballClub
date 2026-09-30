(function () {
  "use strict";

  var WIN_SCORE = 21;
  var STORAGE_KEY = "bvc-scoreboard-v1";
  var HISTORY_KEY = "bvc-game-history-v1";

  var FAKE_HISTORY_SEED = [
    { id: "seed-1", nameA: "Sand Sharks", nameB: "Net Ninjas", a: 21, b: 18, date: "2026-09-27", time: "10:30" },
    { id: "seed-2", nameA: "Spike Squad", nameB: "Beach Bums", a: 15, b: 21, date: "2026-09-25", time: "17:05" },
    { id: "seed-3", nameA: "Ace Ventura", nameB: "Block Party", a: 21, b: 12, date: "2026-09-20", time: "09:15" }
  ];

  var scoreEls = { a: document.getElementById("scoreA"), b: document.getElementById("scoreB") };
  var panelEls = { a: document.querySelector(".team-a"), b: document.querySelector(".team-b") };
  var nameEls = { a: document.getElementById("teamAName"), b: document.getElementById("teamBName") };
  var winnerBanner = document.getElementById("winnerBanner");
  var winnerText = document.getElementById("winnerText");
  var historyListEl = document.getElementById("historyList");
  var historyEmptyEl = document.getElementById("historyEmpty");
  var views = { game: document.getElementById("gameView"), history: document.getElementById("historyView") };
  var tabs = { game: document.getElementById("tabGame"), history: document.getElementById("tabHistory") };

  var state = {
    a: 0,
    b: 0,
    nameA: "Team A",
    nameB: "Team B"
  };

  var bannerDismissed = false;

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (typeof saved.a === "number") state.a = saved.a;
      if (typeof saved.b === "number") state.b = saved.b;
      if (typeof saved.nameA === "string" && saved.nameA.trim()) state.nameA = saved.nameA;
      if (typeof saved.nameB === "string" && saved.nameB.trim()) state.nameB = saved.nameB;
    } catch (e) {
      /* ignore corrupt storage */
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable, continue without persistence */
    }
  }

  function vibrate(pattern) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  function render() {
    scoreEls.a.textContent = String(state.a);
    scoreEls.b.textContent = String(state.b);

    if (nameEls.a.textContent !== state.nameA) nameEls.a.textContent = state.nameA;
    if (nameEls.b.textContent !== state.nameB) nameEls.b.textContent = state.nameB;

    var aWins = state.a >= WIN_SCORE && state.a > state.b;
    var bWins = state.b >= WIN_SCORE && state.b > state.a;

    panelEls.a.classList.toggle("winner", aWins);
    panelEls.b.classList.toggle("winner", bWins);

    if ((aWins || bWins) && !bannerDismissed) {
      var winnerName = aWins ? state.nameA : state.nameB;
      winnerText.textContent = winnerName + " wins!";
      winnerBanner.hidden = false;
    } else {
      winnerBanner.hidden = true;
      winnerText.textContent = "";
    }
  }

  function changeScore(team, delta) {
    var next = state[team] + delta;
    if (next < 0) next = 0;
    state[team] = next;
    bannerDismissed = false;
    save();
    render();
    vibrate(delta > 0 ? 15 : [10, 30, 10]);
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) {
        saveHistory(FAKE_HISTORY_SEED);
        return FAKE_HISTORY_SEED.slice();
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      /* storage unavailable, continue without persistence */
    }
  }

  function renderHistory() {
    var history = loadHistory();
    historyListEl.innerHTML = "";

    if (!history.length) {
      historyEmptyEl.hidden = false;
      return;
    }
    historyEmptyEl.hidden = true;

    history.forEach(function (game) {
      var li = document.createElement("li");
      li.className = "history-item";

      var teams = document.createElement("div");
      teams.className = "history-teams";

      var teamA = document.createElement("span");
      teamA.className = "history-team" + (game.a > game.b ? " winner" : "");
      teamA.textContent = game.nameA;

      var score = document.createElement("span");
      score.className = "history-score";
      score.textContent = game.a + " – " + game.b;

      var teamB = document.createElement("span");
      teamB.className = "history-team" + (game.b > game.a ? " winner" : "");
      teamB.textContent = game.nameB;

      teams.appendChild(teamA);
      teams.appendChild(score);
      teams.appendChild(teamB);

      var meta = document.createElement("div");
      meta.className = "history-meta";
      meta.textContent = game.date + " at " + game.time;

      li.appendChild(teams);
      li.appendChild(meta);
      historyListEl.appendChild(li);
    });
  }

  function saveFinishedGame() {
    var now = new Date();
    var record = {
      id: "game-" + now.getTime(),
      nameA: state.nameA,
      nameB: state.nameB,
      a: state.a,
      b: state.b,
      date: now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate()),
      time: pad2(now.getHours()) + ":" + pad2(now.getMinutes())
    };
    var history = loadHistory();
    history.unshift(record);
    saveHistory(history);

    state.a = 0;
    state.b = 0;
    bannerDismissed = false;
    save();
    render();
    renderHistory();
  }

  function showView(name) {
    Object.keys(views).forEach(function (key) {
      views[key].hidden = key !== name;
      tabs[key].removeAttribute("aria-current");
    });
    tabs[name].setAttribute("aria-current", "page");
    if (name === "history") renderHistory();
  }

  function sanitizeName(el, fallback) {
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) text = fallback;
    if (text.length > 24) text = text.slice(0, 24);
    return text;
  }

  function bindNameEditing(el, key, fallback) {
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    });

    el.addEventListener("paste", function (e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData("text");
      document.execCommand("insertText", false, text);
    });

    el.addEventListener("blur", function () {
      var name = sanitizeName(el, fallback);
      state[key] = name;
      el.textContent = name;
      save();
      render();
    });
  }

  document.getElementById("incA").addEventListener("click", function () { changeScore("a", 1); });
  document.getElementById("decA").addEventListener("click", function () { changeScore("a", -1); });
  document.getElementById("incB").addEventListener("click", function () { changeScore("b", 1); });
  document.getElementById("decB").addEventListener("click", function () { changeScore("b", -1); });

  document.getElementById("resetBtn").addEventListener("click", function () {
    var confirmed = window.confirm("Start a new game? This resets both scores to 0.");
    if (!confirmed) return;
    state.a = 0;
    state.b = 0;
    bannerDismissed = false;
    save();
    render();
    vibrate(20);
  });

  document.getElementById("saveGameBtn").addEventListener("click", function () {
    saveFinishedGame();
    vibrate(20);
  });

  document.getElementById("keepPlayingBtn").addEventListener("click", function () {
    bannerDismissed = true;
    render();
  });

  tabs.game.addEventListener("click", function () { showView("game"); });
  tabs.history.addEventListener("click", function () { showView("history"); });

  bindNameEditing(nameEls.a, "nameA", "Team A");
  bindNameEditing(nameEls.b, "nameB", "Team B");

  load();
  render();
})();
