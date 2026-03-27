const sections = [
  {
    id: "predictions-2025",
    file: "2025_predictions.md",
    kicker: "Season Forecast",
    summary: "Checked against actual 2025 playoff results."
  },
  {
    id: "playoffs-2025",
    file: "2025_playoffs.md",
    kicker: "Actual Outcome",
    summary: "The 2025 result table used as the benchmark."
  },
  {
    id: "predictions-2026",
    file: "2026_predictions.md",
    kicker: "Next Round",
    summary: "Fresh picks for the next season."
  }
];

const DIVISION_COLUMN_MAP = {
  "AL East": "al-east",
  "AL Central": "al-central",
  "AL West": "al-west",
  "NL East": "nl-east",
  "NL Central": "nl-central",
  "NL West": "nl-west",
  "World Series Matchup": "world-series",
  Winner: "winner"
};

const TEAM_STYLES = {
  Astros: { short: "HOU", color: "#eb6e1f" },
  Blue Jays: { short: "TOR", color: "#134a8e" },
  Braves: { short: "ATL", color: "#ba0c2f" },
  Brewers: { short: "MIL", color: "#12284b" },
  Cardinals: { short: "STL", color: "#c41e3a" },
  Cleveland: { short: "CLE", color: "#0c2340" },
  Cubs: { short: "CHC", color: "#0e3386" },
  Dodgers: { short: "LAD", color: "#005a9c" },
  "D-backs": { short: "ARI", color: "#a71930" },
  Giants: { short: "SF", color: "#fd5a1e" },
  Guardians: { short: "CLE", color: "#0c2340" },
  Indians: { short: "CLE", color: "#0c2340" },
  Mariners: { short: "SEA", color: "#005c5c" },
  Mets: { short: "NYM", color: "#002d72" },
  Orioles: { short: "BAL", color: "#df4601" },
  Os: { short: "BAL", color: "#df4601" },
  Padres: { short: "SD", color: "#2f241d" },
  Phillies: { short: "PHI", color: "#e81828" },
  Pirates: { short: "PIT", color: "#27251f" },
  Rangers: { short: "TEX", color: "#003278" },
  "Red Sox": { short: "BOS", color: "#bd3039" },
  Reds: { short: "CIN", color: "#c6011f" },
  Royals: { short: "KC", color: "#004687" },
  Tigers: { short: "DET", color: "#0c2340" },
  Yankees: { short: "NYY", color: "#132448" }
};

async function loadSite() {
  const leaderElement = document.getElementById("accuracy-leader");
  const leaderRibbon = document.getElementById("accuracy-leader-ribbon");
  const championBanner = document.getElementById("champion-banner");
  const consensusBanner = document.getElementById("consensus-banner");

  try {
    const data = await Promise.all(sections.map(loadMarkdownTable));
    data.forEach(renderSection);

    const prediction2025 = data.find((item) => item.id === "predictions-2025");
    const playoff2025 = data.find((item) => item.id === "playoffs-2025");
    const prediction2026 = data.find((item) => item.id === "predictions-2026");

    if (prediction2025) {
      const ranking = getAccuracyRanking(prediction2025.rows);
      const leader = ranking[0];
      const leaderText = leader ? `${leader.name} (${leader.correct} correct)` : "No marked picks";
      leaderElement.textContent = leaderText;
      leaderRibbon.textContent = leaderText;
    }

    if (playoff2025) {
      const champion = getColumnValue(playoff2025, "Winner");
      championBanner.textContent = champion || "Unknown";
    }

    if (prediction2026) {
      const consensus = getMostCommonWinner(prediction2026);
      consensusBanner.textContent = consensus || "No consensus";
    }
  } catch (error) {
    leaderElement.textContent = "Could not load";
    leaderRibbon.textContent = "Could not load";
    championBanner.textContent = "Could not load";
    consensusBanner.textContent = "Could not load";
    document.getElementById("content").innerHTML = `
      <section class="panel error-panel">
        <p>Could not load the markdown files for the site.</p>
      </section>
    `;
    console.error(error);
  }
}

async function loadMarkdownTable(section) {
  const response = await fetch(section.file);
  if (!response.ok) {
    throw new Error(`Failed to load ${section.file}`);
  }

  const markdown = await response.text();
  const lines = markdown.split(/\r?\n/).filter(Boolean);
  const title = lines.find((line) => line.startsWith("# "))?.replace(/^#\s+/, "") ?? section.file;
  const tableLines = lines.filter((line) => line.trim().startsWith("|"));
  const rows = parseMarkdownTable(tableLines);

  return {
    ...section,
    title,
    headers: rows.headers,
    rows: rows.records
  };
}

function parseMarkdownTable(lines) {
  const [headerLine, , ...rowLines] = lines;
  const headers = splitMarkdownRow(headerLine);
  const records = rowLines.map(splitMarkdownRow).filter((row) => row.length === headers.length);
  return { headers, records };
}

function splitMarkdownRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderSection(section) {
  const target = document.getElementById(section.id);
  const template = document.getElementById("section-template");
  const content = template.content.firstElementChild.cloneNode(true);

  content.id = section.id;
  content.querySelector(".section-kicker").textContent = section.kicker;
  content.querySelector("h2").textContent = section.title;

  const meta = content.querySelector(".section-meta");
  meta.appendChild(createMetaPill(`${section.rows.length} entries`));
  meta.appendChild(createMetaPill(section.summary));

  const tableWrap = content.querySelector(".table-wrap");
  tableWrap.appendChild(buildTable(section.headers, section.rows));

  const supplement = content.querySelector(".supplement");
  if (section.id === "predictions-2025") {
    supplement.appendChild(buildScoreGrid(section.rows));
  }

  target.replaceWith(content);
}

function createMetaPill(text) {
  const pill = document.createElement("span");
  pill.className = "meta-pill";
  pill.textContent = text;
  return pill;
}

function buildTable(headers, rows) {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  const headerRow = document.createElement("tr");
  headers.forEach((header, index) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = header;
    cell.dataset.division = DIVISION_COLUMN_MAP[header] || "default";
    cell.dataset.index = String(index);
    headerRow.appendChild(cell);
  });
  thead.appendChild(headerRow);

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? "th" : "td");
      if (index === 0) {
        cell.scope = "row";
      }
      decorateCell(cell, value, headers[index]);
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  return table;
}

function decorateCell(cell, value, header) {
  if (header === "Person") {
    cell.textContent = value;
    return;
  }

  if (header === "World Series Matchup") {
    renderMatchupCell(cell, value);
    return;
  }

  const fragments = splitMarkerFragments(value);
  if (!fragments.length) {
    renderPlainCell(cell, value, header);
    return;
  }

  const stack = document.createElement("div");
  stack.className = "cell-stack";

  fragments.forEach((fragment) => {
    if (fragment.type === "text") {
      const span = document.createElement("span");
      span.className = "cell-muted";
      span.textContent = fragment.value;
      stack.appendChild(span);
      return;
    }

    stack.appendChild(buildTeamChip(fragment.value, fragment.type === "match"));
  });

  cell.appendChild(stack);
}

function renderPlainCell(cell, value, header) {
  if (isTeamColumn(header)) {
    const stack = document.createElement("div");
    stack.className = "cell-stack";
    stack.appendChild(buildTeamChip(value));
    cell.appendChild(stack);
    return;
  }

  cell.textContent = value;
}

function renderMatchupCell(cell, value) {
  const stack = document.createElement("div");
  stack.className = "cell-stack";
  const marked = splitMarkerFragments(value);

  if (marked.length) {
    marked.forEach((fragment) => {
      if (fragment.type === "text") {
        const span = document.createElement("span");
        span.className = "cell-muted";
        span.textContent = fragment.value;
        stack.appendChild(span);
        return;
      }

      const matchup = fragment.value.replace(/\s[✅❌]$/, "");
      stack.appendChild(buildMatchupChip(matchup, fragment.type === "match"));
    });
    cell.appendChild(stack);
    return;
  }

  stack.appendChild(buildMatchupChip(value));
  cell.appendChild(stack);
}

function splitMarkerFragments(value) {
  const markerPattern = /([^✅❌]+?)\s([✅❌])/g;
  const fragments = [];
  let match;
  let lastIndex = 0;

  while ((match = markerPattern.exec(value)) !== null) {
    const [fullMatch, label, marker] = match;
    const start = match.index;

    if (start > lastIndex) {
      const plain = value.slice(lastIndex, start).trim();
      if (plain) {
        fragments.push({ type: "text", value: plain });
      }
    }

    fragments.push({
      type: marker === "✅" ? "match" : "miss",
      value: `${label.trim()} ${marker}`
    });

    lastIndex = start + fullMatch.length;
  }

  const remainder = value.slice(lastIndex).trim();
  if (remainder) {
    fragments.push({ type: "text", value: remainder });
  }

  return fragments;
}

function buildScoreGrid(rows) {
  const wrapper = document.createElement("div");
  const title = document.createElement("p");
  title.className = "section-kicker";
  title.textContent = "2025 Accuracy Snapshot";
  wrapper.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "score-grid";

  getAccuracyRanking(rows).forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = `score-card rank-${Math.min(index + 1, 3)}`;
    card.innerHTML = `
      <span class="score-rank">#${index + 1}</span>
      <h3>${entry.name}</h3>
      <p>${entry.correct} correct · ${entry.incorrect} missed</p>
      <div class="score-metrics">
        <span class="metric-pill">${entry.rate}% hit rate</span>
        <span class="metric-pill">${entry.total} graded picks</span>
      </div>
    `;
    grid.appendChild(card);
  });

  wrapper.appendChild(grid);
  return wrapper;
}

function getAccuracyRanking(rows) {
  return rows.map((row) => {
    const [name, ...picks] = row;
    const joined = picks.join(" ");
    const correct = joined.match(/✅/g)?.length ?? 0;
    const incorrect = joined.match(/❌/g)?.length ?? 0;
    const total = correct + incorrect;
    const rate = total ? Math.round((correct / total) * 100) : 0;
    return { name, correct, incorrect, total, rate };
  }).sort((left, right) => {
    if (right.correct !== left.correct) {
      return right.correct - left.correct;
    }

    if (right.rate !== left.rate) {
      return right.rate - left.rate;
    }

    return left.name.localeCompare(right.name);
  });
}

function getColumnValue(section, headerName) {
  const index = section.headers.indexOf(headerName);
  if (index === -1 || !section.rows[0]) {
    return "";
  }

  return section.rows[0][index];
}

function getMostCommonWinner(section) {
  const winnerIndex = section.headers.indexOf("Winner");
  if (winnerIndex === -1) {
    return "";
  }

  const counts = new Map();
  section.rows.forEach((row) => {
    const winner = row[winnerIndex];
    counts.set(winner, (counts.get(winner) ?? 0) + 1);
  });

  const ordered = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  if (!ordered.length) {
    return "";
  }

  return `${ordered[0][0]} (${ordered[0][1]} picks)`;
}

function isTeamColumn(header) {
  return header !== "Notes" && header !== "Person";
}

function buildTeamChip(rawValue, isMatch = null) {
  const label = rawValue.replace(/\s[✅❌]$/, "").trim();
  const style = getTeamStyle(label);
  const chip = document.createElement("span");
  chip.className = "team-chip";

  if (typeof isMatch === "boolean") {
    chip.classList.add(isMatch ? "match-true" : "match-false");
  }

  const badge = document.createElement("span");
  badge.className = "team-badge";
  badge.style.background = style.color;
  badge.textContent = style.short;

  const name = document.createElement("span");
  name.className = "team-name";
  name.textContent = label;

  chip.append(badge, name);
  return chip;
}

function buildMatchupChip(matchup, isMatch = null) {
  const chip = document.createElement("span");
  chip.className = "team-chip";
  if (typeof isMatch === "boolean") {
    chip.classList.add(isMatch ? "match-true" : "match-false");
  }

  const parts = matchup.split(/\s+vs\.?\s+/i).map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 2) {
    chip.textContent = matchup;
    return chip;
  }

  chip.append(
    buildBadgeOnly(parts[0]),
    buildTextMeta("vs."),
    buildBadgeOnly(parts[1])
  );

  return chip;
}

function buildBadgeOnly(teamName) {
  const style = getTeamStyle(teamName);
  const wrapper = document.createElement("span");
  wrapper.className = "team-chip";
  wrapper.style.paddingRight = "10px";
  wrapper.style.background = "transparent";
  wrapper.style.border = "0";

  const badge = document.createElement("span");
  badge.className = "team-badge";
  badge.style.background = style.color;
  badge.textContent = style.short;

  const name = document.createElement("span");
  name.className = "team-name";
  name.textContent = teamName;

  wrapper.append(badge, name);
  return wrapper;
}

function buildTextMeta(text) {
  const span = document.createElement("span");
  span.className = "team-meta";
  span.textContent = text;
  return span;
}

function getTeamStyle(teamName) {
  const normalized = teamName
    .replace(/^Toronto Blue Jays$/i, "Blue Jays")
    .replace(/^LA Dodgers$/i, "Dodgers")
    .trim();

  return TEAM_STYLES[normalized] ?? {
    short: normalized.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase(),
    color: "#425466"
  };
}

loadSite();