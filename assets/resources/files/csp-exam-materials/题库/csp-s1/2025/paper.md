---
paper_id: csp-s1-2025
title: 2025CCF 非专业级别软件能力认证第一轮（CSP-S）提高级 C++语言试题
year: 2025
date: null
total_score: 100
---

# 2025CCF 非专业级别软件能力认证第一轮（CSP-S）提高级 C++语言试题

## 一、单项选择题

### 第 1 题

<!-- qid: csp-s1-2025-001 | type: single_choice | score: 2 | answer: C | tags: topic:combinatorics -->

有 5 个红色球和 5 个蓝色球，它们除了颜色之外完全相同。将这 10 个球排成一排，要求任意两个蓝色球都不能相邻，有多少种不同的排列方法？

- A. 25
- B. 30
- C. 6
- D. 120

> **题解**
> 答案：C
> 解释：5 个蓝球两两不相邻，等价于先把 5 个红球排成一排，再把蓝球放进它们留出的 6 个空位（含两端）里，每个空位至多一个。同色球彼此不区分，所以只有 C(6,5) = 6 种，选 C。用 10 个位置枚举 5 个蓝球的位置、数出不含「`BB`」的排法，结果同样是 6。A 项 25、B 项 30、D 项 120 都不等于这个计数（D 项 120 只是 5!）。

### 第 2 题

<!-- qid: csp-s1-2025-002 | type: single_choice | score: 2 | answer: A | tags: topic:string -->

在 KMP 算法中，对于模式串 `P="abacaba"`，其 next 数组（`next[i]` 定义为模式串 `P[0...i]` 最长公共前后缀的长度，且数组下标从 0 开始）的值是什么？

- A. {0, 0, 1, 0, 1, 2, 3}
- B. {0, 1, 2, 3, 4, 5, 6}
- C. {0, 0, 1, 1, 2, 2, 3}
- D. {0, 0, 0, 0, 1, 2, 3}

> **题解**
> 答案：A
> 解释：`next[i]` 是 `P[0..i]` 的最长公共前后缀长度，逐位手算：`a`→0、`ab`→0、`aba`→1、`abac`→0、`abaca`→1、`abacab`→2、`abacaba`→3，即 `{0, 0, 1, 0, 1, 2, 3}`，选 A。B 项把位置序号直接当成了前后缀长度，C 项在 `abac` 这类位置多算了 1，D 项把前缀与后缀匹配的时机推后了。用「按定义暴力求最长公共前后缀」与「递推求 `next`」两种写法核对，7 个位置完全一致。

### 第 3 题

<!-- qid: csp-s1-2025-003 | type: single_choice | score: 2 | answer: B | tags: topic:tree -->

对一个大小为 16（下标 0-15）的数组上构建满线段树。查询区间 [3, 11] 时，最少需要访问多少个树结点（包括路径上的父结点和完全包含在查询区间内的结点）？

- A. 7
- B. 8
- C. 9
- D. 10

> **题解**
> 答案：B
> 解释：查询 `[3, 11]` 时，与查询区间相交的结点都要访问，被区间完全包含的结点不再往下走。按这个规则在 16 个叶子的线段树上递归计数：一共访问 8 个结点（3 个被完全包含、5 个还要继续二分），选 B。A 项 7 少算了根一侧的某个中间结点，C 项 9、D 项 10 则把与区间不相交的兄弟结点也算了进去。

### 第 4 题

<!-- qid: csp-s1-2025-004 | type: single_choice | score: 2 | answer: D | tags: topic:tree -->

将字符串 "cat"，"car"，"cart"，"case"，"dog"，"do" 插入一个空的 Trie 树（前缀树）中。构建完成 Trie 树（包括根节点）共有多少个节点？

- A. 8
- B. 9
- C. 10
- D. 11

> **题解**
> 答案：D
> 解释：把 6 个字符串依次插入空的 Trie，结点数 = 根 + 出现过的前缀去重。前缀一共 10 个：`c`、`ca`、`cas`、`case`、`cat`、`car`、`cart`、`d`、`do`、`dog`，加上根就是 11 个，选 D。其中 cat 与 car 共用 c、ca，cart 又复用 car，case 另外分出 cas，dog 与 do 共用 d、o。A 项 8、B 项 9、C 项 10 都比实际少算了结点。

### 第 5 题

<!-- qid: csp-s1-2025-005 | type: single_choice | score: 2 | answer: D | tags: feat:formula,topic:graph -->

对于一个包含 $n$ 个结点和 $m$ 条边的有向无环图（DAG），其拓扑排序的结果有多少种可能？

- A. 只有 1 种
- B. 最多 $n$ 种
- C. 等于 $n-m$ 种
- D. 以上都不对

> **题解**
> 答案：D
> 解释：拓扑排序的种数完全由结构决定：一条链状 DAG 只有 1 种，没有边的 DAG 有 n! 种，说明它既不恒为 1，也不受 n 或 n − m 的约束，所以 A、B、C 三个断言都不成立，选 D。

### 第 6 题

<!-- qid: csp-s1-2025-006 | type: single_choice | score: 2 | answer: D | tags: topic:ds -->

在一个大小为 13 的哈希表中，使用闭散列法的线性探查来解决冲突。哈希函数为 H(key)=key mod 13。依次插入关键字 18, 26, 35, 9, 68, 74。插入 74 后，它最终被放置在哪个索引位置？

- A. 5
- B. 7
- C. 9
- D. 11

> **题解**
> 答案：D
> 解释：逐个插入并做线性探查：18→5，26→0，35→9，9 要放的 9 号位被 35 占住、顺移到 10，68→3，74 的初始位置 9 被 35 占、10 被 9 占，落到 11，选 D。写一段线性探查模拟实跑，74 同样落在第 11 位。A 项 5 是 18 的位置；B 项 7 在本题的探查路径上根本没被访问到。

### 第 7 题

<!-- qid: csp-s1-2025-007 | type: single_choice | score: 2 | answer: A | tags: feat:formula,topic:graph -->

一个包含 8 个顶点的完全图（顶点的编号为 1 倒 8），任意两点之间的边权重等于两顶点编号的差的绝对值。例如，顶点 3 和 7 之间的边权重为 $|7 - 3| = 4$。该图的最小生成树总权重是多少？

- A. 7
- B. 8
- C. 9
- D. 10

> **题解**
> 答案：A
> 解释：编号 1~8 的完全图上，只要连 1−2、2−3、…、7−8 这 7 条权重为 1 的边就能连通，总权重 7；而任何生成树都要 7 条边、每条权重至少 1，下界也是 7，所以最小值就是 7，选 A。用 Kruskal 实跑得到同样的 7。B、C、D 三项都大于这个下界，不可能更优。

### 第 8 题

<!-- qid: csp-s1-2025-008 | type: single_choice | score: 2 | answer: A | tags: topic:tree -->

如果一棵二叉搜索树的后序遍历序列是 2, 5, 4, 8, 12, 10, 6，那么该树的前序遍历是什么？

- A. 6, 4, 2, 5, 10, 8, 12
- B. 6, 4, 5, 2, 10, 12, 8
- C. 2, 4, 5, 6, 8, 10, 12
- D. 12, 8, 10, 5, 2, 4, 6

> **题解**
> 答案：A
> 解释：后序遍历的最后一个数是根 6。左子树的后序是 2, 5, 4，根为 4，余下两数里 2 比 4 小、放在左，5 放在右；右子树的后序是 8, 12, 10，根为 10，8 在左、12 在右。按「根—左—右」写出前序就是 6, 4, 2, 5, 10, 8, 12，选 A。B 项把 2 与 5 的左右写反，C 项恰是递增的中序，D 项是后序的倒序。

### 第 9 题

<!-- qid: csp-s1-2025-009 | type: single_choice | score: 2 | answer: D | tags: topic:dp -->

一个 0-1 背包问题，背包容量为 20，现有 5 个物品，其重量和价值分别为 7, 5, 4, 3, 6 和 15, 12, 9, 7, 13，装入背包的物品能获得的最大总价值是多少？

- A. 43
- B. 41
- C. 45
- D. 44

> **题解**
> 答案：D
> 解释：5 件物品总重 25，超过容量 20，至少要舍弃 5 的重量。枚举全部 2⁵ 种装法：取第 1、3、4、5 件时重量 7 + 4 + 3 + 6 = 20、价值 15 + 9 + 7 + 13 = 44 最大，选 D。A 项 43 对应 7 + 5 + 4 + 3 = 19 的装法，B 项 41、C 项 45 在全部装法里都取不到。

### 第 10 题

<!-- qid: csp-s1-2025-010 | type: single_choice | score: 2 | answer: D | tags: topic:tree -->

在一棵以结点 1 为根的树中，结点 12 和结点 18 的最近公共祖先（LCA）是结点 4。那么下列哪个结点的 LCA 组合是不可能出现的？

- A. LCA(12, 4) = 4
- B. LCA(18, 4) = 4
- C. LCA(12, 18, 4) = 4
- D. LCA(12, 1) = 4

> **题解**
> 答案：D
> 解释：1 是整棵树的根，任何结点与 1 的最近公共祖先都只能是 1，所以 D 项 LCA(12, 1) = 4 不可能，选 D。A 项与 B 项说的是「12（或 18）与它们的公共祖先 4 再求 LCA」，结果仍为 4，成立；C 项对三个结点一起求 LCA，等价于先求 12 与 18 的 LCA，也还是 4。

### 第 11 题

<!-- qid: csp-s1-2025-011 | type: single_choice | score: 2 | answer: C | tags: feat:formula,topic:complexity -->

递归关系式 $T(n) = 2T(n/2) + O(n^2)$ 描述了某个分治算法的时间复杂度。请问该算法的时间复杂度是多少？

- A. O(n)
- B. O(n log n)
- C. O(n²)
- D. O(n² log n)

> **题解**
> 答案：C
> 解释：套主定理：a = 2、b = 2，合并代价 f(n) = n² 的量级高于 n^(log₂2) = n，属于合并占优的情形，T(n) = Θ(n²)，选 C。A 项 n、B 项 n log n 都比合并本身还小，不可能；D 项多出的 log n 只在合并代价与递归代价同阶（例如 f(n) = n log n）时才会出现。

### 第 12 题

<!-- qid: csp-s1-2025-012 | type: single_choice | score: 2 | answer: A | tags: topic:tree -->

在一个初始为空的最小堆（min-heap）中，依次插入元素 20, 12, 15, 8, 10, 5。然后连续执行两次“删除最小值”（delete-min）操作，请问此时堆顶元素是什么？

- A. 10
- B. 12
- C. 15
- D. 20

> **题解**
> 答案：A
> 解释：依次插入 20、12、15、8、10、5，每次向上调整后的堆数组是 `[5, 10, 8, 12, 20, 15]`。第一次删除最小值：5 出堆、末尾的 15 补到根再下沉，得 `[8, 10, 15, 12, 20]`；第二次：8 出堆、20 补根，先后与 10、12 交换，得 `[10, 12, 15, 20]`，堆顶是 `10`，选 A。用 `std::priority_queue` 实跑两次 pop，堆顶同样是 10。

### 第 13 题

<!-- qid: csp-s1-2025-013 | type: single_choice | score: 2 | answer: A | tags: topic:combinatorics -->

1 到 1000 之间，不能被 2、3、5 中任意一个数整除的整数有多少个？

- A. 266
- B. 267
- C. 333
- D. 734

> **题解**
> 答案：A
> 解释：用容斥算能被 2、3、5 中至少一个整除的个数：500 + 333 + 200 − 166 − 100 − 66 + 33 = 734，所以 1~1000 里一个都整除不了的有 1000 − 734 = 266 个，选 A。直接写循环统计 1~1000 也得到 266。B 项 267 比正确值大 1，C 项 333 是「被 3 整除」的个数，D 项 734 正好是被至少一个数整除的个数，方向反了。

### 第 14 题

<!-- qid: csp-s1-2025-014 | type: single_choice | score: 2 | answer: C | tags: topic:dp -->

斐波那契数列的定义为 F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2)。使用朴素递归方法计算 F(n) 的时间复杂度是指数级的，而使用动态规划（或迭代）方法的时间复杂度是线性的。造成这种巨大差异的根本原因是？

- A. 递归函数调用栈开销过大
- B. 操作系统对递归深度有限制
- C. 朴素递归中存在大量的重叠子问题未被重复利用
- D. 动态规划使用了更少的数据存储空间

> **题解**
> 答案：C
> 解释：朴素递归把 `F(n − 1)` 与 `F(n − 2)` 两棵子树整体重算，同一批子问题被反复求解、规模按指数膨胀；动态规划把每个子问题的答案只算一次再复用，因此是线性的，选 C。A 项的调用栈开销与 B 项的递归深度限制只影响常数和上限，不改变量级；D 项说反了——动态规划通常要多花 `O(n)` 的存储。

### 第 15 题

<!-- qid: csp-s1-2025-015 | type: single_choice | score: 2 | answer: B | tags: topic:greedy -->

有 5 个独立的、不可抢占的任务 A1, A2, A3, A4, A5 需要在一台机器上执行（从时间 0 开始执行），每个任务都有对应的处理时长和截止时间，按顺序分别为 3, 4, 2, 5, 1 和 5, 10, 3, 15, 11。如果某一个任务超时，相应的惩罚等于其处理时长。为了最小化总惩罚，应该优先执行哪个任务？

- A. 处理时间最短的任务 A5
- B. 截止时间最早的任务 A3
- C. 处理时间最长的任务 A4
- D. 任意一个任务都可以

> **题解**
> 答案：B
> 解释：把截止时间早的先做：A3（完成于 3）、A1（5）、A2（9）、A5（10）、A4（15），每个的完成时刻都不超过它的截止时刻，总惩罚 0。枚举 5! 种执行顺序，最小惩罚确实是 0，且能达到 0 的只有两种顺序，都以 A3 开头，所以「优先执行截止时间最早的任务 A3」是对的，选 B。若按处理时间最短先做 A5，实跑惩罚为 3，不是最优。

## 二、阅读程序

### (1)

<!-- group: 阅读程序(1) -->

```cpp
 01  #include <algorithm>
 02  #include <cstdio>
 03  #include <cstring>
 04  bool flag[27];
 05  int n;
 06  int p[27];
 07  int ans = 0;
 08  void dfs(int k) {
 09      if (k == n + 1){
 10          ++ans;
 11          return;
 12      }
 13      for (int i = 1; i <= n; ++i) {
 14          if (flag[i]) continue;
 15          if (k > 1 && i == p[k - 1] + 1) continue;
 16          p[k] = i;
 17          flag[i] = true;
 18          dfs(k + 1);
 19          flag[i] = false;
 20      }
 21      return;
 22  }
 23  int main() {
 24      scanf("%d", &n);
 25      dfs(1);
 26      printf("%d\n", ans);
 27      return 0;
 28  }
```

> **程序说明**
> 这段程序读入一个 n，用回溯枚举 1 到 n 的所有排列，输出其中「任何数都不紧跟在比它小 1 的数后面」的排列个数。dfs(k) 确定排列的第 k 位：第 14 行跳过已经用过的数，第 15 行跳过紧接在 p[k − 1] + 1 后面的接法，定下第 k 位后递归到 k + 1，返回时把标记复原。n = 3 时输出 3，n = 4 时输出 11。理解本组题要抓住两点：一是 flag 记录「这个数用没用过」，第 19 行把它复原是回溯能拐回来的关键，删掉这行枚举就退化成一条路走到底；二是 p 数组只在自己被写过之后才会读到，它的初值不影响结果，而删掉第 14 行后同一个数可以在不同位置重复出现，输出会明显变大。

#### 判断题

##### 第 16 题

<!-- qid: csp-s1-2025-016 | type: true_false | score: 1 | answer: T | tags: topic:search -->

（1 分）当输入的 n=3 的时候，程序输出的答案为 3。

> **题解**
> 答案：√
> 解释：程序枚举 1…n 的排列，并排除那些出现「`i` 紧跟在 `i+1` 后面」的排列（起这个作用的是第 15 行的 `continue`）。n = 3 时 6 个排列里 `123`、`231`、`312` 被排除，剩下 3 个，实跑输入 `3` 输出 `3`，主张成立，填 √。

##### 第 17 题

<!-- qid: csp-s1-2025-017 | type: true_false | score: 1.5 | answer: T | tags: feat:formula,topic:search -->

在 dfs 函数运行过程中，k 的取值会满足 $1 \le k \le n+1$。

> **题解**
> 答案：√
> 解释：`dfs` 只在 `k ≤ n` 时被调用：第 18 行从 `dfs(k)` 调 `dfs(k + 1)`，而 `k = n + 1` 时函数第一件事就是累加答案并返回，不会继续往下调，所以 `k` 始终落在 1 ~ n + 1 之间。给 dfs 加上记录最小、最大 k 的语句实跑 n = 1~6，最小值都是 1、最大值都是 n + 1，主张成立，填 √。

##### 第 18 题

<!-- qid: csp-s1-2025-018 | type: true_false | score: 1.5 | answer: F | tags: feat:lineref,topic:search -->

删除第 19 行的 “flag[i]=false”，对答案不会产生影响。

> **题解**
> 答案：×
> 解释：第 19 行把 `flag[i]` 复原是回溯能继续枚举其它排列的前提。删掉这一行后实跑：`n = 3` 的输出从 `3` 变成 `1`，`n = 4` 从 `11` 变成 `1`——枚举退化成只沿一条路走到底，主张不成立，填 ×。

#### 选择题

##### 第 19 题

<!-- qid: csp-s1-2025-019 | type: single_choice | score: 3 | answer: A | tags: topic:search -->

当输入的 n=4 的时候，程序输出的答案为（ ）。

- A. 11
- B. 12
- C. 24
- D. 9

> **题解**
> 答案：A
> 解释：`n = 4` 交给原程序实跑，输出 `11`，对应 A 项。C 项 24 = 4! 是连「`i` 紧跟 `i+1`」都不排除时的排列总数，而第 15 行的限制会砍掉一半以上；B 项 12、D 项 9 也都不是程序的输出。

##### 第 20 题

<!-- qid: csp-s1-2025-020 | type: single_choice | score: 3 | answer: D | tags: feat:lineref,topic:search -->

如果因为某些问题，导致程序运行第 25 行的 dfs 函数之前，数组 p 的初值并不全为 0，则对程序的影响是（ ）。

- A. 输出的答案比原答案要小
- B. 无法确定输出的答案
- C. 程序可能陷入死循环
- D. 没有影响

> **题解**
> 答案：D
> 解释：`p` 数组只在第 15 行被读，而读到的 `p[k − 1]` 一定已经在第 16 行被赋过值（`k = 1` 时那个条件不成立，根本不会读），所以 `p` 的初值从不参与比较。把 p 全部初始化成 9 再实跑，`n = 3` 仍输出 `3`、`n = 4` 仍输出 `11`，选 D。A、B、C 三项都以为初值会进入比较或影响循环。

##### 第 21 题

<!-- qid: csp-s1-2025-021 | type: single_choice | score: 3 | answer: C | tags: feat:lineref,topic:search -->

假如删去第 14 行的 “if(flag[i])continue”，输入 3，得到的输出答案是（ ）。

- A. 27
- B. 3
- C. 16
- D. 12

> **题解**
> 答案：C
> 解释：删掉第 14 行后每个位置都能重复取数，只剩第 15 行排除「`i` 紧跟在 `i+1` 后面」的接法。实跑输入 `3` 的输出是 `16`，对应 C 项。A 项 27 = 3³ 是连相邻限制都不加时的上界，B 项 3 是原程序的输出，D 项 12 与实跑值不符。

### (2)

<!-- group: 阅读程序(2) -->

```cpp
 01  #include <algorithm>
 02  #include <cstdio>
 03  #include <cstring>
 04  #define ll long long
 05  int cnt_broken = 0;
 06  int cnt_check = 0;
 07  int n, k;
 08  inline bool check(int h) {
 09      printf("now check:%d\n", h);
 10      ++cnt_check;
 11      if (cnt_broken == 2) {
 12          printf("You have no egg!\n");
 13          return false;
 14      }
 15      if (h >= k) {
 16          ++cnt_broken;
 17          return true;
 18      } else {
 19          return false;
 20      }
 21  }
 22  inline bool assert_ans(int h) {
 23      if (h == k) {
 24          printf("You are Right using %d checks\n", cnt_check);
 25          return true;
 26      } else {
 27          printf("Wrong answer!\n");
 28          return false;
 29      }
 30  }
 31  inline void guess1(int n) {
 32      for (int i = 1; i <= n; ++i) {
 33          if (check(i)) {
 34              assert_ans(i);
 35              return;
 36          }
 37      }
 38  }
 39  inline void guess2(int n) {
 40      int w = 0;
 41      for (w = 1; w * (w + 1) / 2 < n; ++w)
 42          ;
 43      for (int ti = w, nh = w;; --ti, nh += ti, nh = std::min(nh, n)) {
 44          if (check(nh)) {
 45              for (int j = nh - ti + 1; j < nh; ++j) {
 46                  if (check(j)) {
 47                      assert_ans(j);
 48                      return;
 49                  }
 50              }
 51              assert_ans(nh);
 52              return;
 53          }
 54      }
 55  }
 56  int main() {
 57      scanf("%d%d", &n, &k);
 58      int t;
 59      scanf("%d", &t);
 60      if (t == 1) {
 61          guess1(n);
 62      } else {
 63          guess2(n);
 64      }
 65      return 0;
 66  }
```

（注意：下文的“猜测数”为调用 check 函数的次数（即 cnt_check 的值）；“猜测正确”的含义为 assert_ans 函数 return true（执行第 25 行所在分支）的情况；所有输入保证 $1 \le k \le n$。）

> **程序说明**
> 这段程序模拟「用最少的猜测问出答案」并比较两种问法：输入 n、k 和策略号 t，每调用一次 check 算一次猜测，只有试到不小于 k 的数才算猜中；guess1 从 1 开始逐个往上试，guess2 先用最小的 w 使 w(w + 1)/2 ≥ n，再从 nh = w 起按逐次减一的步长向上跳，命中后回退一小段逐个试，最后由 assert_ans 判定是否真的问到了 k。理解本组题要抓住两点：一是 guess2 的跳跃步长每轮减一，猜测数的量级是 √(2n) 而不是 n；二是 guess1 一旦 check 成功就立刻返回，所以它的猜测数等于 k，且整个运行中「破损」次数最多为 1。

#### 判断题

##### 第 22 题

<!-- qid: csp-s1-2025-022 | type: true_false | score: 1.5 | answer: T | tags: topic:search -->

当输入为 “6 5 1” 时，猜测次数为 5；当输入 “6 5 2” 时，猜测次数为 3。

> **题解**
> 答案：√
> 解释：实跑两个输入：`6 5 1` 时 `guess1` 从 1 试到 5 命中，猜测次数 `5`；`6 5 2` 时 `guess2` 先在 `nh = 5` 处命中、再回头试 4，猜测次数 `3`。两次都与主张一致，填 √。

##### 第 23 题

<!-- qid: csp-s1-2025-023 | type: true_false | score: 1.5 | answer: F | tags: topic:complexity -->

不管输入的 n 和 k 具体为多少，t=2 时的猜测数总是小于等于 t=1 时的猜测数。

> **题解**
> 答案：×
> 解释：反例：`n = 2`、`k = 1`。`t = 1` 时第一次 `check(1)` 就命中，猜测数 `1`；`t = 2` 时先 `check(2)` 不中、再试 1，猜测数 `2`，比 `t = 1` 多。在 n ≤ 40 的全部输入里这类反例有 200 组，主张不成立，填 ×。

##### 第 24 题

<!-- qid: csp-s1-2025-024 | type: true_false | score: 1.5 | answer: T | tags: topic:search -->

不管 t=1 或 t=2，程序都一定会猜到正确结果。

> **题解**
> 答案：√
> 解释：穷举 n ≤ 40 的全部 `(n, k)` 共 820 组实跑，`t = 1` 与 `t = 2` 都以「猜到正确结果」结束，没有一次走到 `Wrong answer`。机理上 `guess1` 从 1 试到 n 必然遇到 k；`guess2` 的试探点 `nh` 逐次上调、最后封顶在 `n ≥ k`，命中后再回退一小段逐个试，同样会问到 k。主张成立，填 √。

#### 选择题

##### 第 25 题

<!-- qid: csp-s1-2025-025 | type: single_choice | score: 3 | answer: B | tags: topic:sim -->

函数 guess1 在运行过程中，cnt_broken 的值最多为（ ）。

- A. 0
- B. 1
- C. 2
- D. n

> **题解**
> 答案：B
> 解释：猜中（`h ≥ k`）时 `check` 把 `cnt_broken` 加一，而 `guess1` 一命中就 `assert_ans` 并 `return`，所以整个运行里 cnt_broken 最多到 1。穷举 n ≤ 40 的每个 k 实跑，最大值也确实只有 1，选 B。A 项 0 不可能（命中必然加一），C 项 2 是 check 里判断「没有蛋了」的阈值，D 项 n 更无从谈起。

##### 第 26 题

<!-- qid: csp-s1-2025-026 | type: single_choice | score: 3 | answer: C | tags: topic:complexity -->

函数 guess2 在运行过程中，最多使用的猜测次数的量级为（ ）。

- A. O(n)
- B. O(n²)
- C. O(√n)
- D. O(log n)

> **题解**
> 答案：C
> 解释：猜测数量的量级由 `w` 决定，而 `w` 是满足 `w(w + 1)/2 ≥ n` 的最小整数，约等于 `√(2n)`。实测各种 n 下的最大猜测次数：n = 10 → 4、100 → 14、400 → 28、1600 → 57、3200 → 80，与 √n 的比值稳定在 1.26 ~ 1.43，正是 `O(√n)`，选 C。A 项 `O(n)` 比实测大一个量级，B 项 `O(n²)` 更大，D 项 `O(log n)` 增速太慢（n 翻倍时猜测数要涨约 41%，不是常数）。

##### 第 27 题

<!-- qid: csp-s1-2025-027 | type: single_choice | score: 3 | answer: A | tags: topic:complexity -->

当输入的 n=100 的时候，代码中 t=1 和 t=2 分别需要的猜测次数最多分别为（ ）。

- A. 100, 14
- B. 100, 13
- C. 99, 14
- D. 99, 13

> **题解**
> 答案：A
> 解释：让 `k` 取遍 1~100 实跑：`t = 1` 的最大猜测数是 100（`k = 100` 时得从 1 试到 100），`t = 2` 的最大猜测数是 14（`w = 14`，第 14 次试探到 100 命中后退回试 98、99），对应 A 项「`100, 14`」。B 项与 D 项的 99 不对——`k = 100` 时 t = 1 必须试满 100 次；C 项的 14 虽然对，但 t = 1 那一栏错了。

### (3)

<!-- group: 阅读程序(3) -->

```cpp
 01  #include <algorithm>
 02  #include <cstdio>
 03  #include <cstring>
 04  #include <vector>
 05  #define ll long long
 06  int n, m;
 07  std::vector<int> k, p;
 08  inline int mpow(int x, int k) {
 09      int ans = 1;
 10      for (; k; k = k >> 1, x = x * x) {
 11          if (k & 1)
 12              ans = ans * x;
 13      }
 14      return ans;
 15  }
 16  std::vector<int> ans1, ans2;
 17  int cnt1, cnt2;
 18  inline void dfs(std::vector<int>& ans, int& cnt, int l, int r, int v) {
 19      if (l > r) {
 20          ++cnt;
 21          ans.push_back(v);
 22          return;
 23      }
 24      for (int i = 1; i <= m; ++i) {
 25          dfs(ans, cnt, l + 1, r, v + k[l] * mpow(i, p[l]));
 26      }
 27      return;
 28  }
 29  std::vector<int> cntans1;
 30  int main() {
 31      scanf("%d%d", &n, &m);
 32      k.resize(n + 1);
 33      p.resize(n + 1);
 34      for (int i = 1; i <= n; ++i) {
 35          scanf("%d%d", &k[i], &p[i]);
 36      }
 37      dfs(ans1, cnt1, 1, n >> 1, 0);
 38      dfs(ans2, cnt2, (n >> 1) + 1, n, 0);
 39      std::sort(ans1.begin(), ans1.end());
 40      int newcnt1 = 1;
 41      cntans1.push_back(1);
 42      for (int i = 1; i < cnt1; ++i) {
 43          if (ans1[i] == ans1[newcnt1 - 1]) {
 44              ++cntans1[newcnt1 - 1];
 45          } else {
 46              ans1[newcnt1++] = ans1[i];
 47              cntans1.push_back(1);
 48          }
 49      }
 50      cnt1 = newcnt1;
 51      std::sort(ans2.begin(), ans2.end());
 52      int las = 0;
 53      ll ans = 0;
 54      for (int i = cnt2 - 1; i >= 0; --i) {
 55          for (; las < cnt1 && ans1[las] + ans2[i] < 0; ++las)
 56              ;
 57          if (las < cnt1 && ans1[las] + ans2[i] == 0)
 58              ans += cntans1[las];
 59      }
 60      printf("%lld\n", ans);
 61      return 0;
 62  }
```

> **程序说明**
> 这段程序用「折半枚举 + 双指针」统计满足 Σ kᵢ · xᵢ^pᵢ = 0（每个 xᵢ ∈ [1, m]）的解数：先把 n 个变量分成前后两半，各自 dfs 枚举所有可能的和（前半存进 ans1、后半存进 ans2），再把 ans1 排序、去重并用 cntans1 记下每个和的重数，最后让 ans2 从大到小扫、ans1 上的下标 las 只单向右移，把两半和相加为 0 的配对数累加输出。输入是 n、m 与 n 组 (kᵢ, pᵢ)，输出一个整数。理解本组题要抓住两点：一是 mpow 是快速幂，一次调用花 O(log p)，这是复杂度里那个对数因子的来源；二是 ans2 的排序不能删，las 只能单调右移，两半都有序才能一次扫描完成配对。

#### 判断题

##### 第 28 题

<!-- qid: csp-s1-2025-028 | type: true_false | score: 1.5 | answer: F | tags: feat:lineref,topic:sort -->

删除第 51 行的 “std::sort(ans2.begin(),ans2.end())” 后，代码输出的结果不会受到影响。

> **题解**
> 答案：×
> 解释：第 51 行把 `ans2` 排好序，后面的双指针（`las` 只向右移）才有意义，删掉它结果一般会变。300 组随机输入里就有 72 组输出不同，例如 `n = 3`、`m = 3`、三组 `(k, p)` 依次取 `(0, 3)`、`(−3, 1)`、`(3, 3)` 时，带排序输出 `3`、删掉后输出 `0`。主张不成立，填 ×。

##### 第 29 题

<!-- qid: csp-s1-2025-029 | type: true_false | score: 1.5 | answer: T | tags: feat:formula,topic:number -->

假设计算过程中不发生溢出，函数 mpow(x,k) 的功能是求出 $x^k$ 的取值。（ ）

> **题解**
> 答案：√
> 解释：这段代码就是快速幂：指数 `k` 每次右移一位、底数 `x` 同步自乘，k 的当前最低位为 1 时就把 x 乘进答案。对 x 取 0~12、k 取 0~12 的全部 151 组（不溢出的）实跑比对，`mpow(x, k)` 与 `x^k` 完全一致，主张成立，填 √。

##### 第 30 题

<!-- qid: csp-s1-2025-030 | type: true_false | score: 1.5 | answer: T | tags: feat:lineref,topic:sort -->

代码中第 39 行到第 50 行的目的是为了将 ans1 数组进行“去重”操作。（ ）

> **题解**
> 答案：√
> 解释：第 39 行先把 `ans1` 排序，第 42~49 行把相邻的相同值合并、并用 `cntans1` 记下每个不同值出现几次，结束后 `cnt1` 变成不同值的个数——这就是去重。拿实跑核对：输入 `3 15 1 2 -1 2 1 2` 时前半部分的和是 15 个不同的平方数，程序里 cnt1 正好是 15；另外 50 组随机输入里 ans1 在去重后也都严格递增。主张成立，填 √。

#### 选择题

##### 第 31 题

<!-- qid: csp-s1-2025-031 | type: single_choice | score: 3 | answer: B | tags: topic:search -->

当输入为 “3 15 1 2 -1 2 1 2” 时，输出结果为（ ）

- A. 4
- B. 8
- C. 0
- D. 10

> **题解**
> 答案：B
> 解释：输入给出 `n = 3`、`m = 15`、`(k, p)` 依次是 `(1, 2)`、`(−1, 2)`、`(1, 2)`，程序求的是 `x₁² − x₂² + x₃² = 0`、即 `x₁² + x₃² = x₂²` 且三个数都在 1~15 的解数。实跑输出 `8`；把解直接数出来也是 8 个：(3, 5, 4)、(4, 5, 3)、(6, 10, 8)、(8, 10, 6)、(5, 13, 12)、(12, 13, 5)、(9, 15, 12)、(12, 15, 9)，选 B。A 项 4 相当于每对解只算一次，C 项 0 与实跑不符。

##### 第 32 题

<!-- qid: csp-s1-2025-032 | type: single_choice | score: 3 | answer: D | tags: feat:formula,topic:complexity -->

记程序结束前 p 数组元素的最大值为 P，则该代码的时间复杂度是（ ）

- A. $O(n)$
- B. $O(m^n \log m^n)$
- C. $O(m^{n/2} \log m^{n/2})$
- D. $O(m^{n/2} ( \log m^{n/2} + \log P ) )$

> **题解**
> 答案：D
> 解释：程序的代价分三块：两半各枚举出约 `m^(n/2)` 个和，展开次数与 m^(n/2) 同阶；两份答案各排序一次，是 `O(m^(n/2) log m^(n/2))`；而每个结点里的 `mpow` 是快速幂、一次 `O(log P)`（`P` 是 `p` 的最大值）。合起来就是 `O(m^(n/2)(log m^(n/2) + log P))`，选 D。实测量级也吻合：`n = 6` 时 `cnt1 + cnt2` 从 m = 5 的 158、m = 20 的 8694 增长到 m = 40 的 66994，与 `m³` 同阶。A 项 `O(n)` 与 B 项 `O(mⁿ log mⁿ)` 分别低估、高估了搜索规模，C 项漏掉快速幂的对数因子。

##### 第 33 题

<!-- qid: csp-s1-2025-033 | type: single_choice | score: 3 | answer: D | tags: feat:formula,topic:math -->

本题所求出的是（ ）。

- A. 满足 $a,b,c \in [1,m]$ 的整数方程 $a^3 + b^3 = c^3$ 的解的数量
- B. 满足 $a,b,c \in [1,m]$ 的整数方程 $a^2 + b^2 = c^2$ 的解的数量
- C. 满足 $x_i \in [0,m]$ 的整数方程 $\sum_{i=1}^{n} k_i \cdot x_i^{p_i} = 0$ 的解的数量
- D. 满足 $x_i \in [1,m]$ 的整数方程 $\sum_{i=1}^{n} k_i \cdot x_i^{p_i} = 0$ 的解的数量

> **题解**
> 答案：D
> 解释：`dfs` 在每一层把 `k[l] · mpow(i, p[l])` 累加进和，`i` 取遍 1~m，两半的结果配对等于 0 时计数，所以统计的是满足 `Σ kᵢ · xᵢ^pᵢ = 0`、每个 `xᵢ ∈ [1, m]` 的整数组数，选 D。A、B 项那两种方程只是 n = 3 且 p 全为 3 或 2 的特例，不是程序的一般含义；C 项把取值范围的下界写成 0，而程序里 i 从 1 开始，取不到 0。

## 三、完善程序

### (1)

<!-- group: 完善程序(1) -->

（特殊最短路）给定一个含 $N$ 个点、$M$ 条边的带权无向图，边权非负。起点为 $S$，终点为 $T$。对于一条 $S$ 到 $T$ 的路径，可以在整条路径中，至多选择一条边作为“免费边”：当第一次经过这条被选中的边时，费用视为 0；如果之后再次经过该边，则仍按其原始权重计算。点和边均允许重复经过。求从 $S$ 到 $T$ 的最小总费用。

以下代码求解了上述问题。试补全程序。

```cpp
 01  #include <algorithm>
 02  #include <iostream>
 03  #include <queue>
 04  #include <vector>
 05  using namespace std;
 06
 07  const long long INF = 1e18;
 08
 09  struct Edge {
 10      int to;
 11      int weight;
 12  };
 13
 14  struct State {
 15      long long dist;
 16      int u;
 17      int used_freebie; // 0 for not used, 1 for used
 18      bool operator>(const State &other) const {
 19          return dist > other.dist;
 20      }
 21  };
 22
 23  int main() {
 24      int n, m, s, t;
 25      cin >> n >> m >> s >> t;
 26
 27      vector<vector<Edge>> adj(n + 1);
 28      for (int i = 0; i < m; ++i) {
 29          int u, v, w;
 30          cin >> u >> v >> w;
 31          adj[u].push_back({v, w});
 32          adj[v].push_back({u, w});
 33      }
 34
 35      vector<vector<long long>> d(n + 1, vector<long long>(2, INF));
 36      priority_queue<State, vector<State>, greater<State>> pq;
 37
 38      d[s][0] = 0;
 39      pq.push({0, s, ①});
 40
 41      while (!pq.empty()) {
 42          State current = pq.top();
 43          pq.pop();
 44
 45          long long dist = current.dist;
 46          int u = current.u;
 47          int used = current.used_freebie;
 48
 49          if (dist > ②) {
 50              continue;
 51          }
 52
 53          for (const auto &edge : adj[u]) {
 54              int v = edge.to;
 55              int w = edge.weight;
 56
 57              if (d[u][used] + w < ③) {
 58                  ③ = d[u][used] + w;
 59                  pq.push({③, v, used});
 60              }
 61
 62              if (used == 0) {
 63                  if (④ < d[v][1]) {
 64                      d[v][1] = ④;
 65                      pq.push({d[v][1], v, 1});
 66                  }
 67              }
 68          }
 69      }
 70
 71      cout << ⑤ << endl;
 72      return 0;
 73  }
```

> **程序说明**
> 这段程序求带权无向图上「全程至多让一条边免费（第一次经过它时费用记为 0）」的最短路：输入 n、m、起点 s、终点 t 与 m 条边，输出最小总费用。做法是把每个点拆成「还没用过免费边」与「已经用过」两种状态，在 2n 个状态上跑 Dijkstra：普通经过一条边就在同一层里松弛，还没用过免费边时再额外做一次「这一步免费」的跨层松弛；因为免费边可用可不用，最终答案取终点两个状态里较小的那个。理解本组题要抓住两点：一是每个点有两个距离，松弛时目标层必须与当前状态对应，否则会把免费名额重复用掉；二是跨层松弛只能从「没用过」的那一层出发。

#### 单选题

##### 第 34 题

<!-- qid: csp-s1-2025-034 | type: single_choice | score: 3 | answer: A | tags: feat:circnum,topic:graph -->

①处应填（ ）

- A. 0
- B. 1
- C. -1
- D. false

> **题解**
> 答案：A
> 解释：入堆记录的第三个数是 `used_freebie`（`0` 表示还没用过免费边），起点 `s` 刚出发时还没享受免费边，所以填 `0`，选 A。把 4 个候选分别代进代码编译，再与「枚举每条边当作免费边」的独立解法在 4000 组随机图上比对：填 0 全部一致；填 `1` 相当于一开局就当作已经用过免费边，结果普遍偏大；填 `−1` 会去访问 `d[u][−1]`，越界崩溃。
> 争议：选项 D 的 `false` 与 A 的 `0` 其实是同一个值：`used_freebie` 声明为 `int`，`pq.push({0, s, false})` 会把 `false` 隐式转成 `0`（这种转换在花括号初始化里不算窄化，编译通过），两段程序在 4000 组随机图上输出逐个相同。所以 A 与 D 在行为上等价，只是 D 没按「`0` 表示还没用过免费边、`1` 表示已用过」这个约定去写；本题按 A 记分。

##### 第 35 题

<!-- qid: csp-s1-2025-035 | type: single_choice | score: 3 | answer: B | tags: feat:circnum,topic:graph -->

②处应填（ ）

- A. d[u][!used]
- B. d[u][used]
- C. d[t][used]
- D. INF

> **题解**
> 答案：B
> 解释：`dist` 是从堆里取出的那条记录里的距离，它可能已经被后来的更优值淘汰了，判掉它的写法就是 `if (dist > d[u][used]) continue;`，选 B。A 项 `d[u][!used]` 比的是另一层，60 组随机图里有 2 组结果偏大；把这一空填成 B 之后，程序在 4000 组随机图上与独立解法完全一致。
> 争议：除了 B 之外，C、D 两个候选也能让程序算出正确结果：C 项 `d[t][used]` 是更严的剪枝（被跳过的状态离终点更远，不可能再改进答案），D 项 `INF` 让判断恒不成立、等于每次都不剪枝，两者在 4000 组随机图上与 B 的输出完全一致，只是 D 会多处理许多过期的堆记录。本题按 B 记分（这一空考的就是「丢掉过期记录」这一步），A 项则确实会算错。

##### 第 36 题

<!-- qid: csp-s1-2025-036 | type: single_choice | score: 3 | answer: B | tags: feat:circnum,topic:graph -->

③处应填（ ）

- A. d[v][1]
- B. d[v][used]
- C. d[u][used]
- D. d[v][0]

> **题解**
> 答案：B
> 解释：从状态 `(u, used)` 沿一条普通边走一步，到达的还是同一层，所以要拿 `d[v][used]` 作为被更新的量，选 B。四个候选分别编译实跑：A 项 `d[v][1]` 会拿「已用免费边」的距离去改另一层（60 组里 3 组出错），C 项 `d[u][used]` 使 `d[u][used] + w < d[u][used]` 恒不成立、普通边完全不松弛（11 组出错），D 项 `d[v][0]` 在用掉免费边之后仍往「没用过」的层里写（1 组出错）；只有 B 全部正确。

##### 第 37 题

<!-- qid: csp-s1-2025-037 | type: single_choice | score: 3 | answer: C | tags: feat:circnum,topic:graph -->

④处应填（ ）

- A. d[v][0]
- B. d[v][1]
- C. d[u][0]
- D. d[u][1]

> **题解**
> 答案：C
> 解释：这个分支是「这一步用掉免费边」，所以更新的是 `v` 的「已用过」状态；此时 `used = 0`，起点的距离就是 `d[u][0]`，于是 `d[v][1] = d[u][0]`，选 C。A 项 `d[v][0]`、B 项 `d[v][1]`、D 项 `d[u][1]` 在 60 组随机图中各有 47 组答案偏小——用它们等于让免费边的名额被重复使用；只有 C 全部正确。

##### 第 38 题

<!-- qid: csp-s1-2025-038 | type: single_choice | score: 3 | answer: C | tags: feat:circnum,topic:graph -->

⑤处应填（ ）

- A. d[t][1]
- B. d[t][0]
- C. min(d[t][0], d[t][1])
- D. d[t][0] + d[t][1]

> **题解**
> 答案：C
> 解释：免费边可用可不用，终点的两个状态都要看，答案是 `min(d[t][0], d[t][1])`，选 C。B 项 `d[t][0]` 完全没用上免费边，实跑 47/60 组偏大；D 项把两个状态相加，55/60 组偏大；A 项 `d[t][1]` 在起点与终点不同、图连通时与 C 同值，但起点就是终点时会输出一个极大的数而不是 0（4000 组随机图里有 1210 组与独立解法不同，都是起点与终点相同的情形）。

### (2)

<!-- group: 完善程序(2) -->

工厂打算通过客户反馈来间接测试生产线，从而找到存在缺陷的生产线。工厂有 $n$ 条生产线（编号 $0 \sim n-1$），已知其中恰有一条生产线存在缺陷。每一轮测试为，从若干生产线的产品取样混合成一个批次发给客户。若该批次中包含缺陷生产线的产品，客户将要求退货（结果记为 1），否则正常收货（记为 0）。受售后压力限制，在所有发货批次中，最多只能有 $k$ 次退货（即结果为 1 的次数 $\le k$）。工厂的目标是，设计最少的间接测试轮数 $w$（发货总批次），保证根据客户收货或退货的反馈结果，唯一确定存在缺陷的生产线。

以下程序实现了工厂的目标，包含两部分：i) 确定 $w$ 的最小值，并设计最优测试方案；ii) 根据测试结果推断存在缺陷的生产线。该程序确定 $w$ 最小值的方法为：由于不同的生产线故障时，测试应当返回不同的结果，因此 $w$ 轮测试的可能结果数不应少于生产线数量。

test_subset() 函数为抽象测试接口，输入所有批次的方案并返回一个二进制编码；该编码表示为每批次的检测结果（即最低位是第 1 批次、最高位是第 $w$ 批次）；其实现此处未给出。

test_subset() 函数为抽象测试接口，输入所有批次的方案并返回一个二进制编码；该编码表示为每批次的检测结果（即最低位是第 1 批次、最高位是第 w 批次）；其实现此处未给出。

试补全程序。

程序代码

```cpp
 01  #include <algorithm>
 02  #include <cstddef>
 03  #include <iostream>
 04  #include <vector>
 05  using namespace std;
 06
 07  long long comb(int w, int i) {
 08      if (i < 0 || i > w) {
 09          return 0;
 10      }
 11      long long res = 1;
 12      for (int t = 1; t <= i; ++t) {
 13          res = res * (w - t + 1) / t;
 14      }
 15      return res;
 16  }
 17
 18  // 计算长度为 w、1 的个数 ≤ k 的码字总数
 19  long long count_patterns(int w, int k) {
 20      long long total = 0;
 21      for (int t = 0; t <= min(w, k); ++t) {
 22          total += comb(w, t);
 23      }
 24      return total;
 25  }
 26
 27  // 抽象测试接口
 28  int test_subset(const vector<vector<int>> &plan);
 29
 30  int solve(int n, int k) {
 31      // === 第 1 步：求最小 w ===
 32      int w = 1;
 33      while (①) {
 34          ++w;
 35      }
 36      cout << w << endl;
 37
 38      // === 第 2 步：生成测试方案 ===
 39      vector<vector<int>> code(n, vector<int>(w, 0));
 40      int idx = 0;
 41      for (int ones = 0; ones <= k && idx < n; ++ones) {
 42          vector<int> bits(w, 0);
 43          fill(bits.begin(), bits.begin() + ones, 1);
 44          do {
 45              for (int b = 0; b < w; ++b) {
 46                  code[idx][b] = bits[b];
 47              }
 48              ++idx;
 49              if (idx >= n) {
 50                  break;
 51              }
 52          } while (std::②);
 53      }
 54
 55      vector<vector<int>> plan(w);
 56      for (int i = 0; i < w; ++i) {
 57          for (int j = 0; j < n; ++j) {
 58              if (③) {
 59                  plan[i].push_back(j);
 60              }
 61          }
 62      }
 63
 64      // === 第 3 步：调用测试接口 ===
 65      int signature = test_subset(plan);
 66
 67      // === 第 4 步：结果解码 ===
 68      vector<int> sig_bits(w, 0);
 69      for (int i = 0; i < w; ++i) {
 70          if (④) {
 71              sig_bits[i] = 1;
 72          }
 73      }
 74
 75      for (int j = 0; j < n; ++j) {
 76          if (⑤) return j;
 77      }
 78  }
 79
 80  int main() {
 81      int n,k;
 82      cin >> n >> k;
 83      int ans = solve();
 84      cout << ans << endl;
 85      return 0;
 86  }
```

> **程序说明**
> 这段程序求「用最少的批次问出唯一一条缺陷生产线」的批次数，并据此解码：n 条生产线、最多允许 k 次退货，所以 w 个批次的结果只能是长度 w、1 的个数不超过 k 的码字，第 1 步把 w 增大到这类码字总数不少于 n；第 2 步给每条生产线分配一个互不相同的码字（先固定 1 的个数、再枚举它们的位置），并按位拼出「第 i 个批次测哪些生产线」的方案；第 3 步把方案交给测试接口拿回一个二进制结果；第 4 步把它还原成 w 位、与各条码字逐条比对，完全相同的那条就是缺陷所在。理解本组题要抓住两点：一是结果数受「最多 k 次退货」限制，码字总数是 Σ C(w, i) 而不是 2ʷ；二是 bits 的初值是同一组 1、0 里字典序最大的排列，枚举要用 prev_permutation 往小走，用 next_permutation 一步就停。

#### 单选题

##### 第 39 题

<!-- qid: csp-s1-2025-039 | type: single_choice | score: 3 | answer: B | tags: feat:circnum,topic:combinatorics -->

①处应填（ ）

- A. (1 << w) < n
- B. count_patterns(w, k) < n
- C. count_patterns(k, w) < n
- D. comb(w, k) < n

> **题解**
> 答案：B
> 解释：题面说明求最小 `w` 的方法是「w 轮的可能结果数不少于生产线数」，而结果受「最多 `k` 次退货」限制，所以结果数等于长度 w、1 的个数不超过 k 的码字总数，即 `count_patterns(w, k)`，选 B。A 项 `(1 << w)` 相当于不限制退货次数，得到的 w 会偏小：`n = 43`、`k = 3` 时它只给到 `6`，而正确答案是 `7`；D 项 `comb(w, k)` 只数「恰好 k 个 1」的码字，w 会偏大（同一个例子实跑输出 `8`）；C 项把两个参数写反，n 稍大就会空转不停。

##### 第 40 题

<!-- qid: csp-s1-2025-040 | type: single_choice | score: 3 | answer: B | tags: feat:circnum,topic:combinatorics -->

②处应填（ ）

- A. next_permutation(bits.begin(), bits.end())
- B. prev_permutation(bits.begin(), bits.end())
- C. next_permutation(bits.begin(), bits.begin()+ones)
- D. prev_permutation(bits.begin(), bits.begin()+ones)

> **题解**
> 答案：B
> 解释：`bits` 每次都是「前 `ones` 个是 1、后面全 0」，这是同一组 1 和 0 的所有排列里字典序最大的一种，所以要从大往小枚举、用 `prev_permutation`，选 B。A 项的 `next_permutation` 一步就返回 `false`，每个 ones 只生成一个码字，生产线多于 `k + 1` 条时后面那些码字全是 0，解码必然出错（240 组用例里 169 组答错）；C、D 项只排前 ones 个位置，而它们全是 1、怎么排都一样，同样只有一个码字。

##### 第 41 题

<!-- qid: csp-s1-2025-041 | type: single_choice | score: 3 | answer: D | tags: feat:circnum,topic:sim -->

③处应填（ ）

- A. (j >> i) & 1
- B. (i >> j) & 1
- C. code[i][j] == 1
- D. code[j][i] == 1

> **题解**
> 答案：D
> 解释：第 55~62 行要拼出「第 `i` 个批次里放了哪些生产线」：`code[j]` 是生产线 `j` 的码字，它的第 i 位为 1 就说明 j 参加第 i 个批次，所以判据是 `code[j][i] == 1`，选 D。A 项 `(j >> i) & 1` 与 B 项 `(i >> j) & 1` 是拿编号当二进制位用，与码字无关；C 项 `code[i][j]` 把两个下标弄反了——`i` 最大只到 `w − 1`，而 `code` 的第一维是生产线编号，批次多于生产线时直接越界。

##### 第 42 题

<!-- qid: csp-s1-2025-042 | type: single_choice | score: 3 | answer: A | tags: feat:circnum,topic:bit -->

④处应填（ ）

- A. (signature >> i) & 1
- B. (signature >> i) ^ 1
- C. signature | (1 << i)
- D. (signature >> i) | 1

> **题解**
> 答案：A
> 解释：`signature` 的第 `i` 位就是第 i 个批次的检测结果（最低位是第 1 批次），取这一位的写法是 `(signature >> i) & 1`，选 A。B 项右移后取反，把「退货」读成了「正常收货」；C 项 `signature | (1 << i)` 与 D 项 `(signature >> i) | 1` 的结果几乎总是非零，等于把每一位都当成 1，解出的码字永远对不上任何生产线（240 组实跑全部答不出结果，程序随后直接崩）。

##### 第 43 题

<!-- qid: csp-s1-2025-043 | type: single_choice | score: 3 | answer: B | tags: feat:circnum,topic:sim -->

⑤处应填（ ）

- A. is_permutation(code[j].begin(), code[j].end(), sig_bits.begin())
- B. code[j] == sig_bits
- C. plan[j] == sig_bits
- D. code[j][i] == sig_bits[i]

> **题解**
> 答案：B
> 解释：`sig_bits` 是还原出来的 `w` 位检测结果，要在 `code` 里找与它完全相同的那一条，对应的下标就是缺陷生产线，所以填 `code[j] == sig_bits`，选 B。A 项只要求两者含同样多个 1（是同一个多重集），很多条生产线会同时「命中」（240 组里 170 组答错）；C 项 `plan[j]` 是「第 `j` 个批次测了哪些生产线」，与 w 位的码字不是一种东西；D 项只比了一位，而且这里的 `i` 已经超出作用域，编译就通不过。

