// person_station 全局脚本
// 功能手册模态框：拉取 graph/MANUAL.md 并渲染为排版良好的 HTML

(function () {
  "use strict";

  var btn = document.getElementById("manualBtn");
  var modal = document.getElementById("manualModal");
  var body = document.getElementById("manualBody");

  if (!btn || !modal || !body) return;

  var loaded = false;

  // ---- 工具函数 ----

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // 行内渲染：粗体 → 行内代码 → 链接 → 删除线（按此顺序，避免互相干扰）
  function inline(s) {
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
    s = s.replace(/~~(.+?)~~/g, "<del>$1</del>");
    return s;
  }

  // 计算行首缩进宽度（tab 视为 2 空格），用于列表嵌套层级
  function indentOf(ws) {
    return ws.replace(/\t/g, "  ").length;
  }

  // ---- 块级渲染 ----
  // 支持：标题、段落、连续引用块、分隔线、代码块、表格、
  // 有序/无序列表（含按缩进嵌套）、行内粗体/代码/链接/删除线。
  function renderMarkdown(md) {
    var lines = md.replace(/\r\n?/g, "\n").split("\n");
    var html = "";
    var listStack = []; // 列表嵌套栈：{type, indent}

    function openList(type, indent) {
      html += "<" + type + ">";
      listStack.push({ type: type, indent: indent, liOpen: false });
    }
    // 关闭栈顶一层（含未闭合的 li）
    function closeTop() {
      var top = listStack.pop();
      if (top.liOpen) html += "</li>";
      html += "</" + top.type + ">";
    }
    // 关闭所有缩进 >= min 的列表层
    function closeLists(min) {
      while (
        listStack.length &&
        listStack[listStack.length - 1].indent >= min
      ) {
        closeTop();
      }
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var t = line.trim();

      // ---- 代码块 ----
      if (t.indexOf("```") === 0) {
        closeLists(0);
        html += "<pre><code>";
        i++;
        while (i < lines.length && lines[i].trim().indexOf("```") !== 0) {
          html += escapeHtml(lines[i]) + "\n";
          i++;
        }
        html += "</code></pre>";
        continue;
      }

      // ---- 表格（连续 | 行，含表头/分隔行） ----
      if (t.charAt(0) === "|") {
        closeLists(0);
        var table = "";
        var inTable = false;
        while (i < lines.length && lines[i].trim().charAt(0) === "|") {
          var row = lines[i].trim();
          // 分隔行（| --- | 或 | :--: |）跳过
          if (/^\|[\s:|-]+\|$/.test(row) && row.indexOf("-") !== -1) {
            i++;
            continue;
          }
          var cells = row
            .split("|")
            .slice(1, -1)
            .map(function (c) {
              return c.trim();
            });
          table += "<tr>";
          for (var c = 0; c < cells.length; c++) {
            table +=
              (inTable ? "<td>" : "<th>") +
              inline(cells[c]) +
              (inTable ? "</td>" : "</th>");
          }
          table += "</tr>";
          inTable = true;
          i++;
        }
        i--;
        if (inTable) {
          html += '<div class="table-wrap"><table>' + table + "</table></div>";
        }
        continue;
      }

      // ---- 标题 ----
      var h = t.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        closeLists(0);
        var lv = h[1].length;
        html += "<h" + lv + ">" + inline(h[2]) + "</h" + lv + ">";
        continue;
      }

      // ---- 引用块（连续的 > 行合并为一个 blockquote） ----
      if (t.charAt(0) === ">") {
        closeLists(0);
        var quoteLines = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) {
          quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
          i++;
        }
        i--;
        var paras = quoteLines.join("\n").split(/\n{2,}/);
        html += "<blockquote>";
        for (var q = 0; q < paras.length; q++) {
          var ptxt = paras[q]
            .split("\n")
            .map(function (s) {
              return s.trim();
            })
            .filter(Boolean)
            .join(" ");
          if (ptxt) html += "<p>" + inline(ptxt) + "</p>";
        }
        html += "</blockquote>";
        continue;
      }

      // ---- 分隔线 ----
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
        closeLists(0);
        html += "<hr>";
        continue;
      }

      // ---- 列表（有序 / 无序，按缩进嵌套） ----
      // 注意：必须用原始 line 匹配以捕获缩进（t 已被 trim，丢失前导空格）
      var ul = line.match(/^(\s*)[-*+]\s+(.*)$/);
      var ol = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
      if (ul || ol) {
        var type = ol ? "ol" : "ul";
        var indent = indentOf(ol ? ol[1] : ul[1]);
        var content = (ol ? ol[3] : ul[2]).trim();

        // 关闭所有比当前层更深（缩进更大）的列表
        while (
          listStack.length &&
          listStack[listStack.length - 1].indent > indent
        ) {
          closeTop();
        }
        // 同层但类型不同（ul/ol 切换）→ 关掉旧的换新的
        if (
          listStack.length &&
          listStack[listStack.length - 1].indent === indent &&
          listStack[listStack.length - 1].type !== type
        ) {
          closeTop();
        }
        // 需要新开一层（栈空 / 缩进更浅 / 刚切换）
        if (
          !listStack.length ||
          listStack[listStack.length - 1].indent !== indent
        ) {
          openList(type, indent);
        }
        // 同层已有打开的 li → 先闭合，再开新 li
        var top = listStack[listStack.length - 1];
        if (top.liOpen) html += "</li>";
        html += "<li>" + inline(content);
        top.liOpen = true;
        continue;
      }

      // ---- 空行：关闭所有打开的列表 ----
      if (t === "") {
        closeLists(0);
        continue;
      }

      // ---- 普通段落（合并连续行，避免吞并列表/标题/表格等） ----
      var p = t;
      while (i + 1 < lines.length) {
        var nt = lines[i + 1].trim();
        if (
          nt === "" ||
          /^(#{1,6})\s+/.test(nt) ||
          nt.charAt(0) === "|" ||
          nt.charAt(0) === ">" ||
          nt.indexOf("```") === 0 ||
          /^(-{3,}|\*{3,}|_{3,})$/.test(nt) ||
          /^\s*[-*+]\s+/.test(lines[i + 1]) ||
          /^\s*\d+[.)]\s+/.test(lines[i + 1])
        ) {
          break;
        }
        i++;
        p += " " + nt;
      }
      closeLists(0);
      html += "<p>" + inline(p) + "</p>";
    }

    closeLists(0);
    return html;
  }

  // ---- 模态框逻辑 ----

  function open() {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // 锁滚动

    if (!loaded) {
      body.innerHTML = '<p class="manual-loading">正在加载手册…</p>';
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
          // file:// 直接打开时浏览器禁止 fetch 本地文件，给出本地服务器引导
          if (
            typeof window !== "undefined" &&
            window.location.protocol === "file:"
          ) {
            body.innerHTML =
              '<p class="manual-error">当前是通过 <code>file://</code> 直接打开页面，' +
              "浏览器禁止加载本地手册文件。</p>" +
              '<p class="manual-hint">请启动本地服务器预览，在 <code>person_station</code> 目录运行：</p>' +
              "<pre><code>python -m http.server 8000</code></pre>" +
              '<p class="manual-hint">然后访问 <a href="http://localhost:8000" target="_blank" rel="noopener">http://localhost:8000</a> 再打开手册。</p>' +
              '<p class="manual-hint">也可 <a href="graph/MANUAL.md" target="_blank" rel="noopener">直接查看手册原文件</a>。</p>';
          } else {
            body.innerHTML =
              '<p class="manual-error">手册加载失败，请稍后重试或直接查看 ' +
              '<a href="graph/MANUAL.md" target="_blank" rel="noopener">graph/MANUAL.md</a>。</p>';
          }
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
