(function () {
    "use strict";

    var DATE_FIELD = "Planlagt dato";
    var ORDER_FIELD = "Planrekkefølge";
    var STATUS_FIELD = "Status";

    function escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function fieldValue(body, fieldName) {
        if (!body) {
            return "";
        }

        var heading = new RegExp(
            "^#{1,6}\\s+" + escapeRegExp(fieldName) + "\\s*$\\r?\\n+([^\\r\\n]+)",
            "im"
        );
        var headingMatch = body.match(heading);
        if (headingMatch) {
            return headingMatch[1].trim();
        }

        var inline = new RegExp(
            "^\\s*(?:[-*]\\s*)?(?:\\*\\*)?" + escapeRegExp(fieldName) +
            "(?:\\*\\*)?\\s*:\\s*(.+)$",
            "im"
        );
        var inlineMatch = body.match(inline);
        return inlineMatch ? inlineMatch[1].trim() : "";
    }

    function plannedDate(issue) {
        var value = fieldValue(issue.body, DATE_FIELD);
        return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
    }

    function planOrder(issue) {
        var value = Number(fieldValue(issue.body, ORDER_FIELD));
        return Number.isInteger(value) && value > 0 ? value : Number.MAX_SAFE_INTEGER;
    }

    function formatDate(value) {
        if (!value) {
            return "Ikke satt";
        }

        return new Intl.DateTimeFormat("nb-NO", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(new Date(value + "T00:00:00"));
    }

    function status(issue) {
        if (issue.state === "closed") {
            return "Fullført";
        }

        return fieldValue(issue.body, STATUS_FIELD) || "Åpen";
    }

    function appendCell(row, content) {
        var cell = document.createElement("td");
        if (typeof content === "string") {
            cell.textContent = content;
        } else {
            cell.appendChild(content);
        }
        row.appendChild(cell);
    }

    function renderIssues(container, issues) {
        var table = document.createElement("table");
        var header = document.createElement("thead");
        var headerRow = document.createElement("tr");
        var body = document.createElement("tbody");

        ["Tittel", "Status", "Planlagt dato"].forEach(function (title) {
            var cell = document.createElement("th");
            cell.scope = "col";
            cell.textContent = title;
            headerRow.appendChild(cell);
        });
        header.appendChild(headerRow);

        issues.sort(function (left, right) {
            var order = planOrder(left) - planOrder(right);
            var leftDate = plannedDate(left) || "9999-12-31";
            var rightDate = plannedDate(right) || "9999-12-31";
            return order || leftDate.localeCompare(rightDate) || left.number - right.number;
        });

        issues.forEach(function (issue) {
            var row = document.createElement("tr");
            var title = document.createElement("a");
            var statusBadge = document.createElement("span");

            title.href = issue.html_url;
            title.textContent = issue.title;
            statusBadge.className = "plan-issues__status plan-issues__status--" + issue.state;
            statusBadge.textContent = status(issue);

            appendCell(row, title);
            appendCell(row, statusBadge);
            appendCell(row, formatDate(plannedDate(issue)));
            body.appendChild(row);
        });

        table.appendChild(header);
        table.appendChild(body);
        container.replaceChildren(table);
    }

    function renderPlan() {
        var container = document.getElementById("plan-issues");
        if (!container) {
            return;
        }

        var repository = container.dataset.repository;
        var label = container.dataset.label;
        var apiUrl = "https://api.github.com/repos/" + repository + "/issues?state=all&labels=" +
            encodeURIComponent(label) + "&per_page=100";

        fetch(apiUrl, { headers: { Accept: "application/vnd.github+json" } })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("GitHub svarte med status " + response.status);
                }
                return response.json();
            })
            .then(function (issues) {
                var planIssues = issues.filter(function (issue) {
                    return !issue.pull_request;
                });

                if (planIssues.length === 0) {
                    container.textContent = "Ingen planoppgaver er opprettet ennå.";
                    return;
                }

                renderIssues(container, planIssues);
            })
            .catch(function () {
                container.textContent = "Planstatus kunne ikke lastes akkurat nå.";
            });
    }

    if (window.document$ && typeof window.document$.subscribe === "function") {
        window.document$.subscribe(renderPlan);
    } else {
        document.addEventListener("DOMContentLoaded", renderPlan);
    }
}());
