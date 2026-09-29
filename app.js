(function () {
  "use strict";

  var WIN_SCORE = 21;
  var STORAGE_KEY = "bvc-scoreboard-v1";

  var scoreEls = { a: document.getElementById("scoreA"), b: document.getElementById("scoreB") };
  var panelEls = { a: document.querySelector(".team-a"), b: document.querySelector(".team-b") };
  var nameEls = { a: document.getElementById("teamAName"), b: document.getElementById("teamBName") };
  var winnerBanner = document.getElementById("winnerBanner");

  var state = {
    a: 0,
    b: 0,
    nameA: "Team A",
    nameB: "Team B"
  };

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

    if (aWins || bWins) {
      var winnerName = aWins ? state.nameA : state.nameB;
      winnerBanner.textContent = winnerName + " wins!";
      winnerBanner.hidden = false;
    } else {
      winnerBanner.hidden = true;
      winnerBanner.textContent = "";
    }
  }

  function changeScore(team, delta) {
    var next = state[team] + delta;
    if (next < 0) next = 0;
    state[team] = next;
    save();
    render();
    vibrate(delta > 0 ? 15 : [10, 30, 10]);
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
    save();
    render();
    vibrate(20);
  });

  bindNameEditing(nameEls.a, "nameA", "Team A");
  bindNameEditing(nameEls.b, "nameB", "Team B");

  load();
  render();
})();
