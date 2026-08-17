// person_station 全局脚本
// 功能手册模态框：拉取 graph/MANUAL.md 并渲染为 HTML

(function () {
  "use strict";

  var btn = document.getElementById("manualBtn");
  var modal = document.getElementById("manualModal");
  var body = document.getElementById("manualBody");

  if (!btn || !modal || !body) return;

  var loaded = false;

  // ---- 极简 Markdown → HTML 渲染（覆盖手册用到的语法） ----
  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // 行内：**粗体** `代码` [链接](url)
  function inline(s) {
    return s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  function renderMarkdown(md) {
    var lines = md.split(/\r?\n/);
    var html = "";
    var inCode = false;
    var inTable = false;
    var inList = null;
    var tableHtml = "";

    function closeList() {
      if (inList) {
        html += "</" + inList + ">\n";
        inList = null;
      }
    }
    function closeTable() {
      if (inTable) {
        html += "<table>\n" + tableHtml + "</table>\n";
        tableHtml = "";
        inTable = false;
      }
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var t = line.trim();

      // 代码块
      if (t.startsWith("```")) {
        if (inCode) {
          html += "</code></pre>\n";
          inCode = false;
        } else {
          closeTable();
          closeList();
          html += "<pre><code>";
          inCode = true;
        }
        continue;
      }
      if (inCode) {
        html += escapeHtml(line) + "\n";
        continue;
      }

      // 表格行（以 | 开头）
      if (t.startsWith("|")) {
        var isSep = /^\|[\s:|-]+\|$/.test(t) && t.indexOf("-") !== -1;
        if (isSep) continue; // 分隔行，跳过
        var cells = t.split("|").slice(1, -1).map(function (c) { return c.trim(); });
        if (!inTable) {
          closeList();
          html += "<table>\n";
          inTable = true;
          tableHtml = "<tr>";
          for (var h = 0; h < cells.length; h++) {
            tableHtml += "<th>" + inline(cells[h]) + "</th>";
          }
          tableHtml += "</tr>\n";
        } else {
          tableHtml += "<tr>";
          for (var c2 = 0; c2 < cells.length; c2++) {
            tableHtml += "<td>" + inline(cells[c2]) + "</td>";
          }
          tableHtml += "</tr>\n";
        }
        continue;
      }
      closeTable();

      // 标题
      var h = t.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        closeList();
        var lv = h[1].length;
        html += "<h" + lv + ">" + inline(h[2]) + "</h" + lv + ">\n";
        continue;
      }

      // 引用
      if (t.startsWith(">")) {
        closeList();
        html += "<blockquote>" + inline(t.replace(/^>\s?/, "")) + "</blockquote>\n";
        continue;
      }

      // 分隔线
      if (/^-{3,}$/.test(t)) {
        closeList();
        html += "<hr>\n";
        continue;
      }

      // 无序列表
      var ul = t.match(/^[-*+]\s+(.*)$/);
      if (ul) {
        if (inList !== "ul") {
          closeList();
          html += "<ul>\n";
          inList = "ul";
        }
        html += "<li>" + inline(ul[1]) + "</li>\n";
        continue;
      }

      // 有序列表
      var ol = t.match(/^\d+\.\s+(.*)$/);
      if (ol) {
        if (inList !== "ol") {
          closeList();
          html += "<ol>\n";
          inList = "ol";
        }
        html += "<li>" + inline(ol[1]) + "</li>\n";
        continue;
      }

      // 空行
      if (t === "") {
        closeList();
        closeTable();
        continue;
      }

      // 普通段落（累积连续行）
      var p = t;
      while (i + 1 < lines.length && lines[i + 1].trim() !== "" &&
             !lines[i + 1].trim().startsWith("#") &&
             !lines[i + 1].trim().startsWith("|") &&
             !lines[i + 1].trim().startsWith("```") &&
             !/^-{3,}$/.test(lines[i + 1].trim())) {
        i++;
        p += " " + lines[i].trim();
      }
      closeList();
      html += "<p>" + inline(p) + "</p>\n";
    }

    closeTable();
    closeList();
    if (inCode) html += "</code></pre>\n";
    return html;
  }

  function open() {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // 锁滚动

    if (!loaded) {
      fetch("graph/MANUAL.md")
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        })
        .then(function (md) {
          body.innerHTML = renderMarkdown(md);
          loaded = true;
        })
        .catch(function () {
          body.innerHTML = '<p class="manual-error">手册加载失败，请稍后重试或直接查看 <a href="graph/MANUAL.md" target="_blank" rel="noopener">graph/MANUAL.md</a>。</p>';
        });
    }
  }

  function close() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    open();
  });

  // 点击遮罩或关闭按钮
  modal.addEventListener("click", function (e) {
    if (e.target.closest("[data-manual-close]")) close();
  });

  // Esc 关闭
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("open")) close();
  });
})();
