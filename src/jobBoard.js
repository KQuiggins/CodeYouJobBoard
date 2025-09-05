let activeJobs = [];
let perPage = 10;
let totalPages = 0;
let currentPage = 1;

document.addEventListener("DOMContentLoaded", async () => {
  const sheetUrl =
    "https://docs.google.com/spreadsheets/d/1OHIJj0D0Q-2lHgSL184vxBaxhIdSYqzso3UJvcRUflo/gviz/tq?tqx=out:csv";

  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", () => {
    applyFilters(activeJobs);
  });

  const pathwayInput = document.getElementById("pathwayFilter");
  pathwayInput.addEventListener("change", () => {
    applyFilters(activeJobs);
  });

  const locationInput = document.getElementById("locationFilter");
  locationInput.addEventListener("change", () => {
    applyFilters(activeJobs);
  });

  try {
    const csvText = await fetchJobData(sheetUrl);
    const jobData = parseJobData(csvText);
    const allJobs = createJobs(jobData.tableHeaders, jobData.jobs);
    const aJobs = getActiveJobs(allJobs);
    ZZapplyFilters(aJobs);

    activeJobs = parseJobData(csvText).jobs;
    applyFilters(activeJobs);
    updateStats(activeJobs);
  } catch (error) {
    console.error("Error loading sheet:", error);
  }
});

function getActiveJobs(allJobs) {
  return allJobs.filter((job) => !job["Deactivate?"]);
}

async function fetchJobData(url) {
  let result;

  const response = await fetch(url);
  result = await response.text();

  return result;
}

function parseJobData(data) {
  let result = {};

  const jobData = data
    .trim()
    .split(/\r?\n/)
    .map(parseCSVLine)
    .filter((row) => row.length)
    .map((row) => row.filter((cell) => cell !== ""))
    .map(replaceUnderscoresInRow);
  // .filter((row) => row[8].trim().toLowerCase() === "false");
  const headers = [...jobData[0]];
  const jobs = createJobs(headers, jobData.slice(1));

  result.tableHeaders = [...jobData[0]];
  result.jobs = [...jobData.slice(1)];

  return result;
}

function createJobs(keys, jobData) {
  const result = [];

  jobData.forEach((job) => {
    const parsedJob = {};

    keys.forEach((key, index) => {
      if (key.trim().toLowerCase() === "date") {
        parsedJob[key] = parseDate(job[index]);
      } else if (key.trim().toLowerCase() === "deactivate?") {
        // Convert the deactivate? field to an actual boolean
        if (job[index].trim().toLowerCase() === "false") {
          parsedJob[key] = false;
        } else {
          parsedJob[key] = true;
        }
      } else if (key.trim().toLowerCase().includes("salary")) {
        // Parse the salary values to floats
        const salaryRange = job[index].trim().replace(/[$,]/g, "").split("-");
        const min = parseFloat(salaryRange[0].trim());
        const max =
          salaryRange.length > 1 ? parseFloat(salaryRange[1].trim()) : null;

        parsedJob[key] = { min, max };
      } else if (key.trim().toLowerCase() === "language") {
        parsedJob[key] = job[index].split(",");
      } else {
        parsedJob[key] = job[index].trim();
      }
    });

    result.push(parsedJob);
  });

  return result;
}

function parseDate(str) {
  const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(\d{4})$/;
  const match = str.match(regex);
  if (!match) return null;

  const [, mm, dd, yyyy] = match;
  const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);

  if (date.getMonth() + 1 !== parseInt(mm) || date.getDate() !== parseInt(dd)) {
    return null;
  }

  return date;
}

function ZZapplyFilters(items) {
  currentPage = 1;
  const criteria = getFilterCriteria();
  const filteredItems = ZZfilterItems(items, criteria);
  console.log(filteredItems);

  // const tableHeaders = [...items[0]];
  // renderTable(filteredItems);
  // populateJobCount(filteredItems);
  // populateMinMaxSalary(filteredItems);
}

function applyFilters(items) {
  currentPage = 1;
  const criteria = getFilterCriteria();
  const filteredItems = filterItems(items, criteria);

  const tableHeaders = [...items[0]];
  renderTable(filteredItems);
  populateJobCount(filteredItems);
  populateMinMaxSalary(filteredItems);
}

function getFilterCriteria() {
  const result = {
    searchTerm: document.getElementById("searchInput").value.trim(),
    pathway: document.getElementById("pathwayFilter").value.trim(),
    location: document.getElementById("locationFilter").value.trim(),
  };

  return result;
}

function filterItems(items, criteria) {
  let result = [...items];

  if (criteria.searchTerm) {
    result = getSearchResults(result, criteria.searchTerm);
  }

  if (criteria.pathway) {
    result = result.filter((item) => item[3].trim() === criteria.pathway);
  }

  if (criteria.location) {
    result = result.filter((item) => item[7].trim() === criteria.location);
  }

  return result;
}

function ZZfilterItems(objects, criteria) {
  let result = [...objects];

  if (criteria.searchTerm) {
    result = ZZgetSearchResults(result, criteria.searchTerm);
  }

  if (criteria.pathway) {
    result = result.filter(
      (item) => item["Pathway"].trim() === criteria.pathway
    );
  }

  if (criteria.location) {
    result = result.filter(
      (item) => item["Location"].trim() === criteria.location
    );
  }

  return result;
}

function getSearchResults(itemsToSearch, searchTerm) {
  const result = itemsToSearch.filter((item) => {
    const employer = item[1].trim().toLowerCase();
    const jobTitle = item[2].trim().toLowerCase();
    const skills = item[4].trim().toLowerCase();

    return (
      employer.includes(searchTerm) ||
      jobTitle.includes(searchTerm) ||
      skills.includes(searchTerm)
    );
  });

  return result;
}

function ZZgetSearchResults(itemsToSearch, searchTerm) {
  const result = itemsToSearch.filter((item) => {
    const employer = item["Employer"].trim().toLowerCase();
    console.log(item);
    const jobTitle = item["Job Title"].trim().toLowerCase();

    return (
      employer.includes(searchTerm) ||
      jobTitle.includes(searchTerm) ||
      item["Language"].some((lang) =>
        lang.trim().toLowerCase().includes(searchTerm)
      )
    );
  });

  return result;
}

function parseCSVLine(line) {
  if (!line.trim()) return []; // skip blank lines
  return (
    line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map((cell) => {
      cell = cell.trim();
      if (cell.startsWith('"') && cell.endsWith('"')) {
        cell = cell.slice(1, -1).replace(/""/g, '"');
      }
      return cell;
    }) || []
  );
}

function replaceUnderscoresInRow(row) {
  const newRow = [...row];
  newRow[7] = newRow[7].replaceAll("_", " ");
  return newRow;
}

function populateJobCount(jobList) {
  document.getElementById("job-count").innerText = jobList.length;
}

function populateMinMaxSalary(jobList) {
  const rangeElement = document.getElementById("pay-range");
  let min = Infinity;
  let max = -Infinity;

  jobList.forEach((job) => {
    const salary = parseDollar(job[5]);

    if (salary < min) min = salary;
    if (salary > max) max = salary;
  });

  rangeElement.innerText = `${formatDollar(min)} - ${formatDollar(max)}`;
}

function parseDollar(str) {
  return parseFloat(str.replace(/[$,]/g, ""));
}

function formatDollar(amount) {
  return (
    "$" +
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function renderTable(tableItems) {
  const tableBody = document.getElementById("jobTableBody");
  const itemsToDisplay = paginate(tableItems, currentPage, perPage);
  tableBody.innerHTML = "";

  itemsToDisplay.forEach((item) => {
    if (item.length < 9) return;

    const tr = document.createElement("tr");

    item.forEach((cell, index) => {
      const td = document.createElement("td");
      if (index === 8 && cell.trim().toLowerCase() === "false") {
        tr.appendChild(td);
        return;
      } else if (index === 8 && cell.trim()) {
        const link = document.createElement("a");
        link.href = cell.trim();
        link.textContent = cell.trim();
        link.target = "_blank";
        td.appendChild(link);
      } else {
        td.textContent = cell.trim();
      }
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });
  renderPaginationControls(tableItems);
}

function paginate(items, currentPage = 1, perPage = 20) {
  totalPages = Math.ceil(items.length / perPage);
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  return items.slice(start, end);
}

function renderPaginationControls(tableItems) {
  const controlsElement = document.getElementById("pagination-controls");
  controlsElement.innerHTML = "";
  if (totalPages <= 1) return;

  if (currentPage !== 1) {
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "◀ Prev";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
      currentPage--;
      renderTable(tableItems);
    };
    controlsElement.appendChild(prevBtn);
  }

  const pageRange = getPaginationRange(currentPage, totalPages);
  pageRange.forEach((p) => {
    if (p === "…") {
      const ellipsisBtn = document.createElement("button");
      ellipsisBtn.textContent = "…";
      ellipsisBtn.onclick = () => {
        const input = prompt("Enter page number:");
        let targetPage = parseInt(input, 10);
        if (isNaN(targetPage) || targetPage < 1) targetPage = currentPage;
        if (targetPage > totalPages) targetPage = totalPages;
        currentPage = targetPage;
        renderTable(tableItems);
      };
      controlsElement.appendChild(ellipsisBtn);
    } else {
      const pageBtn = document.createElement("button");
      pageBtn.textContent = p;
      if (p === currentPage) pageBtn.disabled = true;
      pageBtn.onclick = () => {
        currentPage = p;
        renderTable(tableItems);
      };
      controlsElement.appendChild(pageBtn);
    }
  });

  if (currentPage !== totalPages) {
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next ▶";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
      currentPage++;
      renderTable(tableItems);
    };
    controlsElement.appendChild(nextBtn);
  }
}

function getPaginationRange(current, total) {
  const numNeighboringPages = 2;
  const range = [];
  const rangeWithDots = [];

  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - numNeighboringPages && i <= current + numNeighboringPages)
    ) {
      range.push(i);
    }
  }

  let last = null;
  for (let i of range) {
    if (last) {
      if (i - last === 2) {
        rangeWithDots.push(last + 1);
      } else if (i - last > 2) {
        rangeWithDots.push("…");
      }
    }
    rangeWithDots.push(i);
    last = i;
  }

  return rangeWithDots;
}

// Job stats update function
function updateStats(jobs) {
  const jobCountEl = document.getElementById("job-count");
  const payRangeEl = document.getElementById("pay-range");
  const skillsEl = document.getElementById("skills-list");

  // Number of jobs (within last 30 days)
  const now = new Date();
  const recentJobs = jobs.filter((row) => {
    const postedDate = new Date(row[0]);
    const diffDays = (now - postedDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  });
  jobCountEl.textContent = recentJobs.length;

  // Pay range
  const salaries = jobs
    .map((row) => parseInt(row[5].replace(/[$,]/g, "")))
    .filter((val) => !isNaN(val));

  if (salaries.length > 0) {
    const minSalary = Math.min(...salaries);
    const maxSalary = Math.max(...salaries);
    payRangeEl.textContent = `Min: $${minSalary.toLocaleString()} - Max: $${maxSalary.toLocaleString()}`;
  } else {
    payRangeEl.textContent = "No salary data";
  }

  // Skills counts
  const skillCounts = {};
  jobs.forEach((row) => {
    const skill = row[4];
    if (skill) {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    }
  });

  // Turn into a display string
  const skillsText = Object.entries(skillCounts)
    .map(([skill, count]) => `${skill} ${count}`)
    .join(", ");

  skillsEl.textContent = skillsText;
}
