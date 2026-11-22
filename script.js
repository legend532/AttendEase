
const $ = id => document.getElementById(id);

let subjects = JSON.parse(localStorage.getItem("aeSubjects")) || [];
let records = JSON.parse(localStorage.getItem("aeRecords")) || [];

$("today").textContent = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
});

$("attendanceDate").value =
    new Date().toISOString().split("T")[0];

function saveData() {
    localStorage.setItem("aeSubjects", JSON.stringify(subjects));
    localStorage.setItem("aeRecords", JSON.stringify(records));
}

function getStats(subjectId = null) {
    const filtered = subjectId === null
        ? records
        : records.filter(r => r.subjectId === subjectId);

    const present = filtered.filter(r => r.status === "Present").length;
    const total = filtered.length;
    const absent = total - present;

    return {
        present,
        absent,
        total,
        percent: total ? present / total * 100 : 0
    };
}

function renderSubjects() {
    const cards = $("subjectCards");
    const subjectSelect = $("attendanceSubject");
    const calculatorSelect = $("calculatorSubject");

    cards.innerHTML = "";
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    calculatorSelect.innerHTML =
        '<option value="">Select Subject</option>' +
        '<option value="overall">Overall Attendance</option>';

    if (subjects.length === 0) {
        cards.innerHTML = '<p class="empty">No subjects added yet.</p>';
    }

    subjects.forEach(subject => {
        const stats = getStats(subject.id);

        const barClass = stats.percent >= 75
            ? ""
            : stats.percent >= 65 ? "warning" : "danger";

        const status = stats.total === 0
            ? "No records yet"
            : stats.percent >= 75
                ? "Attendance is on track"
                : "Below 75% target";

        const card = document.createElement("div");
        card.className = "subject-card";

        const heading = document.createElement("h3");
        heading.textContent = subject.name;

        const percentage = document.createElement("p");
        percentage.textContent = stats.percent.toFixed(1) + "% attendance";

        const bar = document.createElement("div");
        bar.className = "subject-progress";

        const fill = document.createElement("div");
        fill.className = barClass;
        fill.style.width = stats.percent + "%";
        bar.appendChild(fill);

        const details = document.createElement("p");
        details.textContent =
            `Present: ${stats.present} | Absent: ${stats.absent} | Total: ${stats.total}`;

        const statusText = document.createElement("p");
        statusText.textContent = status;

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete Subject";
        deleteButton.addEventListener("click", () => {
            if (confirm("Delete this subject and its attendance records?")) {
                subjects = subjects.filter(s => s.id !== subject.id);
                records = records.filter(r => r.subjectId !== subject.id);
                saveData();
                renderAll();
            }
        });

        card.append(heading, percentage, bar, details, statusText, deleteButton);
        cards.appendChild(card);

        const option = document.createElement("option");
        option.value = subject.id;
        option.textContent = subject.name;

        subjectSelect.appendChild(option.cloneNode(true));
        calculatorSelect.appendChild(option);
    });

    updateDashboard();
}

function updateDashboard() {
    const stats = getStats();

    $("overallPercent").textContent = stats.percent.toFixed(1) + "%";
    $("overallBar").style.width = stats.percent + "%";
    $("totalClasses").textContent = stats.total;
    $("presentClasses").textContent = stats.present;
    $("absentClasses").textContent = stats.absent;

    let message = "Add your attendance to get started.";

    if (stats.total > 0) {
        message = stats.percent >= 75
            ? "You are meeting your 75% attendance target."
            : "Your attendance is below the 75% target.";
    }

    $("overallMessage").textContent = message;
}

function renderHistory() {
    const table = $("historyTable");
    table.innerHTML = "";

    const sorted = [...records].sort((a, b) =>
        b.date.localeCompare(a.date)
    );

    if (sorted.length === 0) {
        table.innerHTML =
            '<tr><td colspan="3">No attendance records yet.</td></tr>';
        return;
    }

    sorted.forEach(record => {
        const subject = subjects.find(s => s.id === record.subjectId);
        if (!subject) return;

        const row = document.createElement("tr");

        const dateCell = document.createElement("td");
        dateCell.textContent = record.date;

        const subjectCell = document.createElement("td");
        subjectCell.textContent = subject.name;

        const statusCell = document.createElement("td");
        statusCell.textContent = record.status;
        statusCell.className = record.status === "Present"
            ? "present-status" : "absent-status";

        row.append(dateCell, subjectCell, statusCell);
        table.appendChild(row);
    });
}

function renderAll() {
    renderSubjects();
    renderHistory();
}

$("subjectForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("subjectName").value.trim();

    if (!name) return;

    if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        alert("This subject already exists.");
        return;
    }

    subjects.push({
        id: Date.now().toString(),
        name
    });

    $("subjectName").value = "";
    saveData();
    renderAll();
});

$("attendanceForm").addEventListener("submit", event => {
    event.preventDefault();

    const subjectId = $("attendanceSubject").value;
    const date = $("attendanceDate").value;
    const status = $("attendanceStatus").value;

    if (!subjectId || !date) {
        alert("Please select a subject and date.");
        return;
    }

    const existingIndex = records.findIndex(r =>
        r.subjectId === subjectId && r.date === date
    );

    const newRecord = { subjectId, date, status };

    if (existingIndex >= 0) {
        records[existingIndex] = newRecord;
    } else {
        records.push(newRecord);
    }

    saveData();
    renderAll();
    alert("Attendance saved successfully!");
});

$("calculateLeave").addEventListener("click", () => {
    const selected = $("calculatorSubject").value;
    const planned = Number($("plannedClasses").value);
    const target = Number($("targetPercent").value);
    const result = $("leaveResult");

    if (!selected || !Number.isInteger(planned) ||
        planned <= 0 || !Number.isFinite(target) ||
        target <= 0 || target > 100) {
        result.textContent =
            "Please select a subject and enter valid planned classes and a target between 1 and 100.";
        return;
    }

    const stats = getStats(
        selected === "overall" ? null : selected
    );

    if (stats.total > planned) {
        result.textContent =
            "Planned classes cannot be less than classes already recorded.";
        return;
    }

    const required = Math.ceil(planned * target / 100);
    const remaining = planned - stats.total;
    const maxLeave = stats.present + remaining - required;

    let message = `
        <strong>Current Attendance:</strong> ${stats.percent.toFixed(1)}%<br>
        <strong>Required Present Classes:</strong> ${required}<br>
        <strong>Remaining Classes:</strong> ${remaining}<br>
    `;

    if (maxLeave >= 0) {
        message += `
            <strong>Maximum Additional Classes You Can Miss:</strong>
            <span class="safe">${maxLeave} classes</span>
        `;
    } else {
        message += `
            <strong class="danger">Target cannot be reached</strong><br>
            Even attending all remaining classes will not meet your target.
        `;
    }

    result.innerHTML = message;
});

$("downloadCSV").addEventListener("click", () => {
    if (records.length === 0) {
        alert("No attendance records available.");
        return;
    }

    const rows = [
        ["Date", "Subject", "Status"]
    ];

    records.forEach(record => {
        const subject = subjects.find(s => s.id === record.subjectId);
        if (subject) {
            rows.push([record.date, subject.name, record.status]);
        }
    });

    const csv = rows.map(row =>
        row.map(value =>
            '"' + String(value).replace(/"/g, '""') + '"'
        ).join(",")
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "AttendEase_My_Attendance.csv";
    link.click();
    URL.revokeObjectURL(url);
});

renderAll();
