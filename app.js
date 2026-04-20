/* ═══════════════════════════════════════════════
   Parallax — GPA Tracker | app.js
   Supabase Direct Frontend Integration
   ═══════════════════════════════════════════════ */

'use strict';

/* ─── Supabase Configuration ─── */
const SUPABASE_URL = 'https://szaotmrscyvavgjpmgjw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KFWl9uXTMNmSDUJGRuGwAA_eNNM7sMv';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ─── Initial Data ─── */
const state = {
  user: null,
  courses: [],
  grades: [],
  gpaHistory: [],
  activePage: 'dashboard',
  courseFilter: 'all',
  gradeFilter: 'all',
  passwordSetMode: false,
  leaderboardView: 'overall',
  isSpecialUser: false
};

const PREDEFINED_USERS = ['Hussnain', 'Haroon', 'Faizan', 'Alima', 'Mahdiya', 'Amna'];
const SPECIAL_USERS = {
  'Amna': {
    password: 'Beautifull',
    isSpecial: true,
    type: 'angel'
  }
};

/* ─── Auth System ─── */
async function initializeAuth() {
  try {
    const { data: users, error } = await supabaseClient
      .from('users')
      .select('username, password_set')
      .order('username');

    if (error) throw error;

    // Always show predefined users
    const allUsers = [...PREDEFINED_USERS];
    const dbUsers = (users || []).map(u => u.username);
    // Add any additional users from DB not in predefined
    dbUsers.forEach(username => {
      if (!allUsers.includes(username)) allUsers.push(username);
    });

    const userSelectionDiv = $('user-selection');
    userSelectionDiv.innerHTML = '';

    allUsers.forEach(username => {
      const dbUser = (users || []).find(u => u.username === username);
      const passwordSet = dbUser ? dbUser.password_set : false;
      const btn = el('button', 'user-selection-btn', '');
      const initials = username.substring(0, 2).toUpperCase();
      btn.innerHTML = `
        <div class="user-avatar-large">${initials}</div>
        <div class="user-name-text">${username}</div>
      `;
      btn.type = 'button';
      btn.onclick = (e) => {
        e.preventDefault();
        selectUser(username, passwordSet);
      };
      userSelectionDiv.appendChild(btn);
    });
    console.log('Created', allUsers.length, 'user buttons (predefined + db)');
  } catch (err) {
    console.error('Failed to load users:', err);
    // Fallback to predefined users if Supabase fails
    const userSelectionDiv = $('user-selection');
    userSelectionDiv.innerHTML = '';
    PREDEFINED_USERS.forEach(username => {
      const btn = el('button', 'user-selection-btn', '');
      const initials = username.substring(0, 2).toUpperCase();
      btn.innerHTML = `
        <div class="user-avatar-large">${initials}</div>
        <div class="user-name-text">${username}</div>
      `;
      btn.type = 'button';
      btn.onclick = (e) => {
        e.preventDefault();
        selectUser(username, false);
      };
      userSelectionDiv.appendChild(btn);
    });
    console.log('Created', PREDEFINED_USERS.length, 'fallback user buttons');
    showToast('Using demo mode - Supabase not connected', 'info');
  }
}

function selectUser(username, passwordSet) {
  showToast(`Selected user: ${username}`, 'info'); // Confirm selection
  $('selected-user').value = username;
  
  // Check if it's a special user
  if (SPECIAL_USERS[username]) {
    state.passwordSetMode = false;
    $('password-mode-label').textContent = `Enter special password for ${username}`;
  } else {
    state.passwordSetMode = !passwordSet;
    $('password-mode-label').textContent = state.passwordSetMode 
      ? `First time? Set your password for ${username}` 
      : `Enter password for ${username}`;
  }
  
  $('user-selection').style.display = 'none';
  $('auth-form').style.display = 'block';
  $('auth-submit-btn').textContent = state.passwordSetMode ? 'Set Password' : 'Login';
  $('auth-pass').focus();
  $('auth-error').classList.add('hidden');
}

function resetAuthUI() {
  $('selected-user').value = '';
  $('password-mode-label').textContent = '';
  $('user-selection').style.display = 'grid';
  $('auth-form').style.display = 'none';
  $('auth-pass').value = '';
  $('auth-error').classList.add('hidden');
}

async function handleAuth(e) {
  e.preventDefault();
  const username = $('selected-user').value;
  const password = $('auth-pass').value;
  const errorEl = $('auth-error');

  if (!username) {
    errorEl.textContent = 'Please choose an account first.';
    errorEl.classList.remove('hidden');
    return;
  }

  // Check if this is a special user (Amna)
  if (SPECIAL_USERS[username]) {
    if (password !== SPECIAL_USERS[username].password) {
      errorEl.textContent = 'Invalid password for this user.';
      errorEl.classList.remove('hidden');
      return;
    }
    
    // Handle Amna special user
    state.user = username;
    state.isSpecialUser = true;
    updateUserProfile();
    
    // Hide auth and show special page
    $('auth-overlay').classList.add('hidden');
    $('app-shell').classList.add('hidden');
    
    // Load angel page
    const angelPage = $('angel-page');
    if (angelPage) {
      angelPage.classList.remove('hidden');
      document.body.classList.remove('auth-mode');
      showToast(`Welcome, ${state.user}!`, 'success');
    }
    return;
  }

  // For demo mode with predefined users, allow empty password
  if (PREDEFINED_USERS.includes(username) && !password) {
    // Skip Supabase auth for demo
    state.user = username;
    state.isSpecialUser = false;
    state.courses = [
      { id: 1, code: 'CS-301', name: 'Data Structures', credits: 3, color: '#7c3aed' },
      { id: 2, code: 'MATH-201', name: 'Calculus II', credits: 4, color: '#22c55e' },
      { id: 3, code: 'ENG-101', name: 'English Composition', credits: 3, color: '#ef4444' }
    ];
    state.grades = [
      { id: 1, courseId: 1, name: 'Midterm Exam', type: 'Midterm', score: 85, total: 100, date: '2024-10-15' },
      { id: 2, courseId: 2, name: 'Quiz 1', type: 'Quiz', score: 92, total: 100, date: '2024-09-20' }
    ];
    updateUserProfile();
    $('auth-overlay').classList.add('hidden');
    $('app-shell').classList.remove('hidden');
    document.body.classList.remove('auth-mode');
    showToast(`Welcome, ${state.user}! (Demo Mode)`, 'success');
    initDashboard();
    renderGrades();
    return;
  }

  errorEl.classList.add('hidden');
  $('auth-submit-btn').disabled = true;

  try {
    if (state.passwordSetMode) {
      const { error } = await supabaseClient
        .from('users')
        .update({ password, password_set: true })
        .eq('username', username);

      if (error) throw error;
      showToast('Password set! Logging in...', 'success');
    } else {
      const { data: user, error } = await supabaseClient
        .from('users')
        .select('password')
        .eq('username', username)
        .single();

      if (error || !user || user.password !== password) {
        throw new Error('Invalid password');
      }
    }

    const { data: courses } = await supabaseClient
      .from('courses')
      .select('*')
      .order('id');

    const { data: grades } = await supabaseClient
      .from('grades')
      .select('*')
      .eq('username', username)
      .order('date', { ascending: false });

    state.user = username;
    state.isSpecialUser = false;
    state.courses = (courses || []).map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      credits: c.credits,
      color: c.color || '#a855f7'
    }));
    state.grades = (grades || []).map(g => ({
      id: g.id,
      courseId: g.course_id,
      name: g.name,
      type: g.type,
      score: g.score,
      total: g.total,
      date: g.date
    }));

    updateUserProfile();
    
    $('auth-overlay').classList.add('hidden');
    $('app-shell').classList.remove('hidden');
    document.body.classList.remove('auth-mode');
    
    // Update profile display
    $('profile-name').textContent = `Welcome, ${state.user}!`;
    loadProfilePic();
    
    showToast(`Welcome, ${state.user}!`, 'success');
    initDashboard();
    renderGrades();

  } catch (err) {
    errorEl.textContent = state.passwordSetMode ? 'Failed to set password' : 'Invalid username or password';
    errorEl.classList.remove('hidden');
    console.error('Auth error:', err);
  } finally {
    $('auth-submit-btn').disabled = false;
  }
}



function logout() {
  state.user = null;
  state.isSpecialUser = false;
  state.courses = [];
  state.grades = [];
  state.gpaHistory = [];
  
  $('app-shell').classList.add('hidden');
  const angelPage = $('angel-page');
  if (angelPage) {
    angelPage.classList.add('hidden');
  }
  $('auth-overlay').classList.remove('hidden');
  document.body.classList.add('auth-mode');
  
  // Clear inputs and reset auth UI
  $('auth-pass').value = '';
  resetAuthUI();
  
  // Reset profile
  $('profile-img').src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzMTM1M2MiLz4KPHBhdGggZD0iTTIwIDIwQzIyLjc2MTQgMjAgMjUgMTcuNzYxNCAyNSAxNUMyNSAxMi4yMzg2IDIyLjc2MTQgMTAgMjAgMTBDMTcuMjM4NiAxMCAxNSAxMi4yMzg2IDE1IDE1QzE1IDE3Ljc2MTQgMTcgMjAgMjAiIHN0cm9rZT0iIzk1OGRhMSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
  $('profile-name').textContent = 'Welcome back!';
  
  initializeAuth();
  
  showToast('Logged out successfully', 'info');
}

/* ─── Update User Profile ─── */
function updateUserProfile() {
  const username = state.user || 'User';
  // Generate initials from username
  const initials = username
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
  
  const avatarEl = document.querySelector('.avatar');
  if (avatarEl) avatarEl.textContent = initials;
  
  const avatarNameEl = document.querySelector('.avatar-name');
  if (avatarNameEl) avatarNameEl.textContent = username;
  
  const avatarRoleEl = document.querySelector('.avatar-role');
  if (avatarRoleEl) avatarRoleEl.textContent = 'Student';
}

/* ─── Helpers ─── */
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

function pct(score, total) { return Math.round((score / total) * 100); }

function gradeLabel(p) {
  if (p >= 97) return 'A+';
  if (p >= 93) return 'A';
  if (p >= 90) return 'A−';
  if (p >= 87) return 'B+';
  if (p >= 83) return 'B';
  if (p >= 80) return 'B−';
  if (p >= 77) return 'C+';
  if (p >= 73) return 'C';
  if (p >= 70) return 'C−';
  if (p >= 67) return 'D+';
  if (p >= 60) return 'D';
  return 'F';
}

function gradeGpa(p) {
  if (p >= 97) return 4.0;
  if (p >= 93) return 4.0;
  if (p >= 90) return 3.7;
  if (p >= 87) return 3.3;
  if (p >= 83) return 3.0;
  if (p >= 80) return 2.7;
  if (p >= 77) return 2.3;
  if (p >= 73) return 2.0;
  if (p >= 70) return 1.7;
  if (p >= 67) return 1.3;
  if (p >= 60) return 1.0;
  return 0.0;
}

function gradeClass(p) {
  if (p >= 90) return 'grade-a';
  if (p >= 80) return 'grade-b';
  if (p >= 70) return 'grade-c';
  if (p >= 60) return 'grade-d';
  return 'grade-f';
}

function courseAvg(courseId) {
  const gs = state.grades.filter(g => g.courseId === courseId);
  if (!gs.length) return null;
  const total = gs.reduce((s, g) => s + pct(g.score, g.total), 0);
  return Math.round(total / gs.length);
}

function semesterGPA() {
  let points = 0, credits = 0;
  state.courses.forEach(c => {
    const avg = courseAvg(c.id);
    if (avg !== null) {
      points += gradeGpa(avg) * c.credits;
      credits += c.credits;
    }
  });
  return credits ? (points / credits).toFixed(2) : '—';
}

function formatDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─── Navigation ─── */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  $('page-' + name).classList.add('active');
  $('nav-' + name).classList.add('active');
  state.activePage = name;
  if (name === 'courses') renderCourses();
  if (name === 'grades') renderGrades();
  if (name === 'analytics') renderAnalytics();
  if (name === 'comparison') renderComparison();
  if (name === 'leaderboard') renderLeaderboard();
}

/* ─── Dashboard ─── */
function initDashboard() {
  // GPA gauge animation
  const arc = $('gpa-arc');
  const cgpa = parseFloat(semesterGPA()) || 0;
  const fullLen = 251.2;
  const offset = fullLen - (cgpa / 4.0) * fullLen;
  setTimeout(() => { arc.style.strokeDashoffset = offset; }, 200);

  // Update main GPA display
  $('dash-gpa-val').textContent = cgpa.toFixed(2);

  // Update stats
  $('dash-sgpa').textContent = semesterGPA();

  // Calculate and update credit hours and course count
  const totalCredits = state.courses.reduce((sum, c) => sum + c.credits, 0);
  const courseCount = state.courses.length;
  $('dash-credits').textContent = totalCredits;
  $('dash-course-count').textContent = `${courseCount} course${courseCount !== 1 ? 's' : ''}`;

  // Calculate highest grade
  let highestGrade = null;
  let highestCourse = null;
  state.courses.forEach(c => {
    const avg = courseAvg(c.id);
    if (avg !== null && (highestGrade === null || avg > highestGrade)) {
      highestGrade = avg;
      highestCourse = c;
    }
  });

  // Update highest grade display
  if (highestGrade !== null && highestCourse) {
    $('dash-highest-grade').textContent = gradeLabel(highestGrade);
    $('dash-highest-course').textContent = highestCourse.name;
    $('dash-highest-percent').textContent = `${highestGrade.toFixed(1)}%`;
  } else {
    $('dash-highest-grade').textContent = '—';
    $('dash-highest-course').textContent = 'No grades yet';
    $('dash-highest-percent').textContent = '—';
  }

  // Calculate at risk courses (below C+ which is ~77%)
  const atRiskCount = state.courses.filter(c => {
    const avg = courseAvg(c.id);
    return avg !== null && avg < 77;
  }).length;
  $('dash-at-risk').textContent = atRiskCount;

  // Update semester progress (simplified - could be based on weeks or assignments)
  const totalGrades = state.grades.length;
  const progressPercent = Math.min(totalGrades * 5, 100); // Simple progress based on grades added
  $('dash-progress-percent').textContent = `${progressPercent}%`;
  $('dash-progress-bar').style.width = `${progressPercent}%`;
  $('dash-semester-info').textContent = totalGrades > 0 ? `${totalGrades} grade${totalGrades !== 1 ? 's' : ''} recorded` : 'Add grades to see progress';

  // Update trend numbers (simplified - using current GPA)
  $('trend-current').textContent = cgpa.toFixed(2);
  $('trend-growth').textContent = '+0.00'; // Placeholder
  $('trend-starting').textContent = '0.00'; // Placeholder

  // Recent activity
  const recent = [...state.grades].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  const list = $('recent-activity');
  list.innerHTML = '';
  recent.forEach(g => {
    const course = state.courses.find(c => c.id === g.courseId);
    const p = pct(g.score, g.total);
    const li = el('li', 'activity-item');
    li.innerHTML = `
      <div class="activity-dot" style="background:${course.color};"></div>
      <div class="activity-info">
        <div class="activity-name">${g.name}</div>
        <div class="activity-course">${course.code} • ${g.type} • ${formatDate(g.date)}</div>
      </div>
      <div class="activity-score ${gradeClass(p)}">
        <span class="score-val">${p}%</span>
        <span class="grade-tag">${gradeLabel(p)}</span>
      </div>`;
    list.appendChild(li);
  });

  initGpaTrendChart();
}

/* ─── GPA Trend Chart ─── */
let trendChart = null;
function initGpaTrendChart() {
  const ctx = $('gpa-trend-chart').getContext('2d');
  if (trendChart) { trendChart.destroy(); }

  const labels = state.gpaHistory.map(h => h.sem);
  const data = state.gpaHistory.map(h => h.cgpa);

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'CGPA',
        data,
        fill: true,
        borderColor: '#a855f7',
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'transparent';
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, 'rgba(168,85,247,.35)');
          g.addColorStop(1, 'rgba(168,85,247,.0)');
          return g;
        },
        tension: 0.45,
        pointBackgroundColor: '#a855f7',
        pointBorderColor: '#1a1d24',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2.5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#252830',
          titleColor: '#e2dae9',
          bodyColor: '#a09ab0',
          borderColor: '#312c3e',
          borderWidth: 1,
          callbacks: {
            label: ctx => ` GPA: ${ctx.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#252830', drawBorder: false },
          ticks: { color: '#958da1' }
        },
        y: {
          min: 3.0,
          max: 4.0,
          grid: { color: '#252830', drawBorder: false },
          ticks: {
            color: '#958da1',
            callback: v => v.toFixed(1)
          }
        }
      }
    }
  });
}

function setTrendPeriod(period, btn) {
  document.querySelectorAll('#page-dashboard .filter-chips .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const slice = period === '2yr' ? state.gpaHistory.slice(-4) : state.gpaHistory;
  trendChart.data.labels = slice.map(h => h.sem);
  trendChart.data.datasets[0].data = slice.map(h => h.cgpa);
  trendChart.update();
}

/* ─── Courses ─── */
function renderCourses(filter) {
  if (filter) state.courseFilter = filter;
  const grid = $('courses-grid');
  grid.innerHTML = '';

  let filtered = state.courses;
  if (state.courseFilter === 'A') filtered = state.courses.filter(c => { const a = courseAvg(c.id); return a !== null && a >= 90; });
  else if (state.courseFilter === 'B') filtered = state.courses.filter(c => { const a = courseAvg(c.id); return a !== null && a >= 80 && a < 90; });
  else if (state.courseFilter === 'risk') filtered = state.courses.filter(c => { const a = courseAvg(c.id); return a !== null && a < 73; });

  $('courses-count').textContent = `${filtered.length} courses`;

  filtered.forEach(c => {
    const avg = courseAvg(c.id);
    const displayAvg = avg !== null ? avg : '—';
    const gl = avg !== null ? gradeLabel(avg) : '?';
    const gc = avg !== null ? gradeClass(avg) : '';
    const grades = state.grades.filter(g => g.courseId === c.id);
    const isRisk = avg !== null && avg < 73;
    const card = el('div', 'course-card card');
    card.innerHTML = `
      <div class="course-card-header">
        <div class="course-icon" style="background:${c.color}22;color:${c.color};">${c.code.split('-')[0].charAt(0)}</div>
        ${isRisk ? '<div class="risk-badge">⚠ At Risk</div>' : ''}
      </div>
      <div class="course-code">${c.code}</div>
      <div class="course-name">${c.name}</div>
      <div class="course-meta">${c.credits} credits • ${grades.length} grades</div>
      <div class="course-progress-wrap">
        <div class="cp-label">
          <span>Avg Score</span>
          <span class="${gc}" style="font-weight:700;">${displayAvg}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${avg || 0}%;background:${c.color};"></div>
        </div>
      </div>
      <div class="course-grade-row">
        <div class="grade-big ${gc}">${gl}</div>
        <div class="gpa-pts">GPA: ${avg !== null ? gradeGpa(avg).toFixed(1) : '—'}</div>
      </div>`;
    grid.appendChild(card);
  });
}

function filterCourses(type, btn) {
  document.querySelectorAll('#page-courses .filter-chips .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderCourses(type);
}

/* ─── Grades Page ─── */
function renderGrades(filter) {
  if (filter !== undefined) state.gradeFilter = filter;

  // Build tabs
  const tabs = $('grade-tabs');
  tabs.innerHTML = '<button class="tab-btn ' + (state.gradeFilter === 'all' ? 'active' : '') + '" onclick="filterGrades(\'all\',this)">All</button>';
  state.courses.forEach(c => {
    const btn = el('button', 'tab-btn' + (state.gradeFilter == c.id ? ' active' : ''));
    btn.textContent = c.code;
    btn.onclick = () => filterGrades(c.id, btn);
    tabs.appendChild(btn);
  });

  // Populate course select in modal
  const sel = $('m-course');
  sel.innerHTML = '<option value="">Select course…</option>';
  state.courses.forEach(c => {
    const o = el('option');
    o.value = c.id;
    o.textContent = `${c.code} — ${c.name}`;
    sel.appendChild(o);
  });

  // Table
  const tbody = $('grades-tbody');
  tbody.innerHTML = '';
  let rows = [...state.grades].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (state.gradeFilter !== 'all') rows = rows.filter(g => g.courseId == state.gradeFilter);

  rows.forEach(g => {
    const course = state.courses.find(c => c.id === g.courseId);
    const p = pct(g.score, g.total);
    const tr = el('tr');
    tr.innerHTML = `
      <td class="grade-name-cell">
        <div class="grade-dot" style="background:${course.color};"></div>
        <span>${g.name}</span>
      </td>
      <td><span class="course-pill" style="--pill-clr:${course.color};">${course.code}</span></td>
      <td><span class="type-tag">${g.type}</span></td>
      <td class="score-cell"><b>${g.score}</b><span class="score-sep">/${g.total}</span></td>
      <td><span class="grade-badge ${gradeClass(p)}">${gradeLabel(p)} <small>${p}%</small></span></td>
      <td class="date-cell">${formatDate(g.date)}</td>
      <td><button class="del-btn" onclick="deleteGrade(${g.id})" data-tooltip="Delete">🗑</button></td>`;
    tbody.appendChild(tr);
  });

  if (!rows.length) {
    const tr = el('tr');
    tr.innerHTML = '<td colspan="7" style="text-align:center;padding:3rem;color:var(--on-surface-var);">No grades found</td>';
    tbody.appendChild(tr);
  }
}

function filterGrades(filter, btn) {
  document.querySelectorAll('#grade-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGrades(filter);
}

function deleteGrade(id) {
  state.grades = state.grades.filter(g => g.id !== id);
  
  supabaseClient
    .from('grades')
    .delete()
    .eq('id', id)
    .then(() => {
      renderGrades();
      if (state.activePage === 'dashboard') initDashboard();
      showToast('Grade deleted', 'success');
    })
    .catch(err => {
      showToast('Failed to delete grade', 'error');
      console.error(err);
    });
}

/* ─── Analytics ─── */
let distChart = null, donutChart = null;

function renderAnalytics() {
  renderScoreDistribution();
  renderDonut();
  renderCategoryList();
  renderWhatIfSliders();
}

function renderScoreDistribution() {
  const ctx = $('score-dist-chart').getContext('2d');
  if (distChart) distChart.destroy();

  const buckets = [0, 0, 0, 0, 0, 0]; // <60,60-69,70-79,80-89,90-96,97+
  state.grades.forEach(g => {
    const p = pct(g.score, g.total);
    if (p < 60) buckets[0]++;
    else if (p < 70) buckets[1]++;
    else if (p < 80) buckets[2]++;
    else if (p < 90) buckets[3]++;
    else if (p < 97) buckets[4]++;
    else buckets[5]++;
  });

  distChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['< 60', '60–69', '70–79', '80–89', '90–96', '97–100'],
      datasets: [{
        label: 'Grades',
        data: buckets,
        backgroundColor: ['#ef444440','#f59e0b40','#fbbf2440','#22c55e40','#7c3aed40','#a855f740'],
        borderColor: ['#ef4444','#f59e0b','#fbbf24','#22c55e','#7c3aed','#a855f7'],
        borderWidth: 1.5,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#252830',
          titleColor: '#e2dae9',
          bodyColor: '#a09ab0',
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#958da1', font: { size: 11 } }
        },
        y: {
          grid: { color: '#252830' },
          ticks: { color: '#958da1', stepSize: 1 }
        }
      }
    }
  });
}

function renderDonut() {
  const ctx = $('donut-chart').getContext('2d');
  if (donutChart) donutChart.destroy();

  const counts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  state.grades.forEach(g => {
    const p = pct(g.score, g.total);
    if (p >= 90) counts.A++;
    else if (p >= 80) counts.B++;
    else if (p >= 70) counts.C++;
    else if (p >= 60) counts.D++;
    else counts.F++;
  });

  const labels = Object.keys(counts).filter(k => counts[k] > 0);
  const data = labels.map(k => counts[k]);
  const colors = { A: '#a855f7', B: '#7c3aed', C: '#22c55e', D: '#f59e0b', F: '#ef4444' };

  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map(l => colors[l] + 'cc'),
        borderColor: labels.map(l => colors[l]),
        borderWidth: 2,
        hoverOffset: 6,
      }]
    },
    options: {
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#252830',
          titleColor: '#e2dae9',
          bodyColor: '#a09ab0',
        }
      }
    }
  });

  // Legend
  const legend = $('donut-legend');
  legend.innerHTML = '';
  labels.forEach((l, i) => {
    const d = el('div', 'legend-item');
    d.innerHTML = `<div class="legend-dot" style="background:${colors[l]};"></div>
      <div class="legend-info"><span class="legend-label">Grade ${l}</span>
      <span class="legend-val">${data[i]} grades</span></div>`;
    legend.appendChild(d);
  });
}

function renderCategoryList() {
  const types = {};
  state.grades.forEach(g => {
    if (!types[g.type]) types[g.type] = { total: 0, count: 0 };
    types[g.type].total += pct(g.score, g.total);
    types[g.type].count++;
  });

  const list = $('category-list');
  list.innerHTML = '';
  const typeColors = {
    Quiz: '#a855f7',
    Assignment: '#7c3aed',
    Midterm: '#06b6d4',
    Final: '#ef4444',
    Lab: '#22c55e',
    Project: '#f59e0b'
  };

  Object.entries(types).forEach(([type, data]) => {
    const avg = Math.round(data.total / data.count);
    const clr = typeColors[type] || '#958da1';
    const div = el('div', 'category-item');
    div.innerHTML = `
      <div class="cat-label">
        <span style="color:${clr};font-weight:600;">${type}</span>
        <span class="cat-count">${data.count} grades</span>
        <span class="cat-avg ${gradeClass(avg)}" style="margin-left:auto;">${avg}%</span>
      </div>
      <div class="progress-bar-wrap" style="height:5px;margin-top:.4rem;">
        <div class="progress-bar-fill" style="width:${avg}%;background:${clr};"></div>
      </div>`;
    list.appendChild(div);
  });
}

function renderWhatIfSliders() {
  const wrap = $('whatif-sliders');
  wrap.innerHTML = '';

  state.courses.forEach(c => {
    const avg = courseAvg(c.id) || 75;
    const div = el('div', 'whatif-slider-item');
    div.innerHTML = `
      <div class="whatif-row">
        <span class="whatif-course">${c.code}</span>
        <span class="whatif-score" id="wis-${c.id}">${avg}%</span>
      </div>
      <input type="range" class="whatif-slider" min="0" max="100" value="${avg}"
        oninput="updateWhatIf(${c.id}, this.value)"
        style="--clr:${c.color};" />`;
    wrap.appendChild(div);
  });

  updateWhatIfResult();
}

function updateWhatIf(courseId, val) {
  $(`wis-${courseId}`).textContent = val + '%';
  updateWhatIfResult();
}

function updateWhatIfResult() {
  let points = 0, credits = 0;
  state.courses.forEach(c => {
    const slider = document.querySelector(`input[oninput*="updateWhatIf(${c.id}"]`);
    const score = slider ? parseInt(slider.value) : (courseAvg(c.id) || 75);
    points += gradeGpa(score) * c.credits;
    credits += c.credits;
  });
  const currentGPA = parseFloat(semesterGPA()) || 3.5;
  const newTotal = credits ? points / credits : 3.5;
  const blended = ((currentGPA * 3 + newTotal * credits) / (3 + credits)).toFixed(2);
  $('whatif-result').textContent = blended;
}

/* ─── Modal ─── */
function openModal() {
  // Set today's date
  const today = new Date().toISOString().split('T')[0];
  $('m-date').value = today;
  $('modal-overlay').classList.add('open');

  // Populate course select
  const sel = $('m-course');
  sel.innerHTML = '<option value="">Select course…</option>';
  state.courses.forEach(c => {
    const o = el('option');
    o.value = c.id;
    o.textContent = `${c.code} — ${c.name}`;
    sel.appendChild(o);
  });
}

function closeModal() {
  $('modal-overlay').classList.remove('open');
  ['m-name','m-score','m-total'].forEach(id => { const el = $(id); if (el) el.value = ''; });
  $('m-total').value = '100';
  $('m-course').value = '';
  $('score-preview').textContent = '— %';
}

function closeModalOutside(e) {
  if (e.target.id === 'modal-overlay') closeModal();
}

function updateScorePreview() {
  const score = parseFloat($('m-score').value);
  const total = parseFloat($('m-total').value) || 100;
  if (isNaN(score)) { $('score-preview').textContent = '— %'; return; }
  const p = Math.round((score / total) * 100);
  const gl = gradeLabel(p);
  $('score-preview').textContent = `${p}% — ${gl}`;
  $('score-preview').className = 'score-preview ' + gradeClass(p);
}

async function submitGrade() {
  const name = $('m-name').value.trim();
  const courseId = parseInt($('m-course').value);
  const type = $('m-type').value;
  const score = parseFloat($('m-score').value);
  const total = parseFloat($('m-total').value) || 100;
  const date = $('m-date').value;

  if (!name || !courseId || isNaN(score)) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('grades')
      .insert({
        id: Date.now(),
        username: state.user,
        course_id: courseId,
        name,
        type,
        score,
        total,
        date,
        submitted_by: state.user,
        submitted_at: new Date().toISOString()
      });

    if (error) throw error;

    const newGrade = {
      id: Date.now(),
      courseId,
      name,
      type,
      score,
      total,
      date
    };

    state.grades.push(newGrade);
    closeModal();
    showToast(`Grade "${name}" added!`, 'success');

    if (state.activePage === 'dashboard') initDashboard();
    if (state.activePage === 'grades') renderGrades();
    if (state.activePage === 'courses') renderCourses();
    if (state.activePage === 'analytics') renderAnalytics();

  } catch (err) {
    showToast('Failed to add grade', 'error');
    console.error(err);
  }
}

/* ─── Toast ─── */
function showToast(msg, type = 'success') {
  const t = el('div', `toast toast-${type}`, msg);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 350);
  }, 3000);
}

/* ─── Semester Switch ─── */
function switchSemester(val) {
  const msgs = {
    spring25: 'Spring 2025',
    fall24: 'Fall 2024',
    spring24: 'Spring 2024'
  };
  showToast(`Viewing ${msgs[val]} data`, 'info');
}

/* ─── Comparison Page ─── */
async function renderComparison() {
  if (!state.user) return;
  
  const container = $('comparison-content');
  container.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="spinner"></div><p>Loading comparison data...</p></div>';

  try {
    const { data: allGrades } = await supabaseClient.from('grades').select('*');

    const comparison = {};

    state.grades.forEach(userGrade => {
      const userPercent = Math.round((userGrade.score / userGrade.total) * 100);
      const key = `${userGrade.courseId}-${userGrade.type}`;

      const classGradesForType = (allGrades || []).filter(g => 
        g.course_id === userGrade.courseId && g.type === userGrade.type
      );

      if (!comparison[userGrade.courseId]) {
        const course = state.courses.find(c => c.id === userGrade.courseId);
        comparison[userGrade.courseId] = {
          courseName: course?.name || 'Unknown',
          courseCode: course?.code || 'N/A',
          userAverage: 0,
          classAverage: 0,
          types: {}
        };
      }

      if (!comparison[userGrade.courseId].types[userGrade.type]) {
        comparison[userGrade.courseId].types[userGrade.type] = {
          type: userGrade.type,
          userGrades: [],
          userAverage: 0,
          classAverage: 0
        };
      }

      comparison[userGrade.courseId].types[userGrade.type].userGrades.push({
        name: userGrade.name,
        score: userPercent,
        date: userGrade.date
      });

      if (classGradesForType.length > 0) {
        const classAvg = Math.round(
          classGradesForType.reduce((s, g) => s + ((g.score / g.total) * 100), 0) / classGradesForType.length
        );
        comparison[userGrade.courseId].types[userGrade.type].classAverage = classAvg;
      }
    });

    Object.entries(comparison).forEach(([courseId, courseData]) => {
      let typeAvgs = [];
      let typeClassAvgs = [];

      Object.entries(courseData.types).forEach(([type, typeData]) => {
        const userAvg = typeData.userGrades.length > 0
          ? Math.round(typeData.userGrades.reduce((s, g) => s + g.score, 0) / typeData.userGrades.length)
          : 0;
        typeData.userAverage = userAvg;
        typeAvgs.push(userAvg);

        if (typeData.classAverage > 0) {
          typeClassAvgs.push(typeData.classAverage);
        }
      });

      courseData.userAverage = typeAvgs.length > 0 
        ? Math.round(typeAvgs.reduce((a, b) => a + b, 0) / typeAvgs.length)
        : 0;
      courseData.classAverage = typeClassAvgs.length > 0
        ? Math.round(typeClassAvgs.reduce((a, b) => a + b, 0) / typeClassAvgs.length)
        : 0;
    });

    container.innerHTML = '';

    Object.entries(comparison).forEach(([courseId, courseData]) => {
      const card = el('div', 'card', '');
      card.style.marginBottom = '1.5rem';
      
      const diff = courseData.userAverage - courseData.classAverage;
      const isAbove = diff >= 0;
      const diffText = isAbove ? `+${diff}%` : `${diff}%`;
      const diffColor = isAbove ? '#22c55e' : '#ef4444';
      const diffIcon = isAbove ? '📈' : '📉';

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1rem;">
          <div>
            <div class="card-title">${courseData.courseCode} — ${courseData.courseName}</div>
            <div style="font-size:.85rem;color:var(--on-surface-var);margin-top:.3rem;">Performance vs Class Average</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:.9rem;color:${diffColor};font-weight:700;">${diffIcon} ${diffText}</div>
            <div style="font-size:.75rem;color:var(--on-surface-var);">your average</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
          <div style="background:rgba(168,85,247,.08);padding:1rem;border-radius:8px;border-left:3px solid #a855f7;">
            <div style="font-size:.75rem;color:var(--on-surface-var);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem;">Your Average</div>
            <div style="font-size:1.8rem;font-weight:700;color:#a855f7;">${courseData.userAverage}%</div>
          </div>
          <div style="background:rgba(168,85,247,.04);padding:1rem;border-radius:8px;border-left:3px solid #958da1;">
            <div style="font-size:.75rem;color:var(--on-surface-var);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem;">Class Average</div>
            <div style="font-size:1.8rem;font-weight:700;color:#958da1;">${courseData.classAverage}%</div>
          </div>
        </div>

        <div style="border-top:1px solid var(--surface-2);padding-top:1rem;">
          <div style="font-size:.85rem;font-weight:600;margin-bottom:.8rem;color:var(--on-surface);">By Assessment Type</div>
      `;

      Object.values(courseData.types).forEach(typeData => {
        const typeDiff = typeData.userAverage - typeData.classAverage;
        const typeIsAbove = typeDiff >= 0;
        const typeDiffText = typeIsAbove ? `+${typeDiff}%` : `${typeDiff}%`;
        const typeDiffColor = typeIsAbove ? '#22c55e' : '#ef4444';

        const typeDiv = el('div', '');
        typeDiv.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:.6rem;background:var(--surface-2);border-radius:6px;margin-bottom:.5rem;';
        typeDiv.innerHTML = `
          <div style="flex:1;">
            <div style="font-weight:500;">${typeData.type}</div>
            <div style="font-size:.8rem;color:var(--on-surface-var);">${typeData.userGrades.length} ${typeData.userGrades.length === 1 ? 'grade' : 'grades'}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:.85rem;"><span style="font-weight:600;color:var(--on-surface);">${typeData.userAverage}%</span> vs <span style="color:var(--on-surface-var);">${typeData.classAverage}%</span></div>
            <div style="font-size:.75rem;color:${typeDiffColor};font-weight:600;margin-top:.2rem;">${typeIsAbove ? '↑' : '↓'} ${typeDiffText}</div>
          </div>
        `;
        card.appendChild(typeDiv);
      });

      card.innerHTML += `</div>`;
      container.appendChild(card);
    });

    if (Object.keys(comparison).length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--on-surface-var);">No comparison data available. Add some grades first!</div>';
    }

  } catch (err) {
    console.error('Failed to load comparison:', err);
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--on-surface-var);">Error loading data</div>';
  }
}

/* ─── Leaderboard ─── */
function switchLeaderboardView(view, btn) {
  const leaderboardContent = document.querySelector('#leaderboard-content');
  leaderboardContent?.parentElement?.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  state.leaderboardView = view;
  renderLeaderboard();
}

async function renderLeaderboard() {
  const container = $('leaderboard-content');
  container.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="spinner"></div><p>Loading leaderboard...</p></div>';

  try {
    const { data: allGrades } = await supabaseClient.from('grades').select('*');

    const leaderboardData = {
      overall: [],
      bySubject: {},
      byAssessment: {}
    };

    PREDEFINED_USERS.forEach(username => {
      const userGrades = (allGrades || []).filter(g => g.username === username);
      const scores = userGrades.map(g => Math.round((g.score / g.total) * 100));
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      leaderboardData.overall.push({
        username,
        overallAverage: avg,
        totalGrades: userGrades.length
      });
    });
    leaderboardData.overall.sort((a, b) => b.overallAverage - a.overallAverage);

    state.courses.forEach(course => {
      leaderboardData.bySubject[course.id] = {
        courseCode: course.code,
        courseName: course.name,
        rankings: []
      };

      PREDEFINED_USERS.forEach(username => {
        const userGrades = (allGrades || []).filter(g => g.username === username && g.course_id === course.id);
        const scores = userGrades.map(g => Math.round((g.score / g.total) * 100));
        const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        leaderboardData.bySubject[course.id].rankings.push({
          username,
          average: avg,
          count: userGrades.length
        });
      });

      leaderboardData.bySubject[course.id].rankings.sort((a, b) => b.average - a.average);
    });

    state.courses.forEach(course => {
      leaderboardData.byAssessment[course.id] = {};

      const assessmentTypes = new Set();
      (allGrades || []).forEach(g => {
        if (g.course_id === course.id) assessmentTypes.add(g.type);
      });

      assessmentTypes.forEach(type => {
        leaderboardData.byAssessment[course.id][type] = {
          type,
          rankings: []
        };

        PREDEFINED_USERS.forEach(username => {
          const userGrades = (allGrades || []).filter(g => g.username === username && g.course_id === course.id && g.type === type);
          const scores = userGrades.map(g => Math.round((g.score / g.total) * 100));
          const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
          leaderboardData.byAssessment[course.id][type].rankings.push({
            username,
            average: avg,
            count: userGrades.length
          });
        });

        leaderboardData.byAssessment[course.id][type].rankings.sort((a, b) => b.average - a.average);
      });
    });

    container.innerHTML = '';

    if (state.leaderboardView === 'overall') {
      renderOverallLeaderboard(leaderboardData.overall);
    } else if (state.leaderboardView === 'subject') {
      renderSubjectLeaderboard(leaderboardData.bySubject);
    } else if (state.leaderboardView === 'assessment') {
      renderAssessmentLeaderboard(leaderboardData.bySubject, leaderboardData.byAssessment);
    }

  } catch (err) {
    console.error('Failed to load leaderboard:', err);
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--on-surface-var);">Error loading leaderboard</div>';
  }
}

function renderOverallLeaderboard(leaderboard) {
  const container = $('leaderboard-content');
  const table = el('table', 'grades-table');
  table.style.width = '100%';
  
  const thead = el('thead');
  thead.innerHTML = `
    <tr>
      <th style="text-align:center;">Rank</th>
      <th>Name</th>
      <th style="text-align:right;">Overall Average</th>
      <th style="text-align:right;">Grades</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = el('tbody');
  leaderboard.forEach((user, idx) => {
    const isCurrentUser = user.username === state.user;
    const tr = el('tr');
    tr.style.backgroundColor = isCurrentUser ? 'rgba(168,85,247,.1)' : '';
    
    const medal = ['🥇', '🥈', '🥉'][idx] || '•';
    tr.innerHTML = `
      <td style="text-align:center;font-weight:700;font-size:1.2rem;">${medal}</td>
      <td style="font-weight:${isCurrentUser ? '700' : '500'};color:${isCurrentUser ? '#a855f7' : 'var(--on-surface)'};">${user.username}</td>
      <td style="text-align:right;"><span class="grade-badge" style="background:${user.overallAverage >= 90 ? '#a855f740' : '#7c3aed40'};color:${user.overallAverage >= 90 ? '#a855f7' : '#7c3aed'};">${user.overallAverage}%</span></td>
      <td style="text-align:right;color:var(--on-surface-var);">${user.totalGrades}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

function renderSubjectLeaderboard(subjects) {
  const container = $('leaderboard-content');
  
  Object.entries(subjects).forEach(([courseId, courseData]) => {
    const card = el('div', 'card', '');
    card.style.marginBottom = '1.5rem';
    
    card.innerHTML = `<div class="card-title">${courseData.courseCode} — ${courseData.courseName}</div>`;
    
    const table = el('table', 'grades-table');
    table.style.width = '100%;marginTop:1rem';
    
    const thead = el('thead');
    thead.innerHTML = `
      <tr>
        <th style="text-align:center;">Rank</th>
        <th>Name</th>
        <th style="text-align:right;">Average</th>
        <th style="text-align:right;">Grades</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = el('tbody');
    courseData.rankings.forEach((user, idx) => {
      const isCurrentUser = user.username === state.user;
      const tr = el('tr');
      tr.style.backgroundColor = isCurrentUser ? 'rgba(168,85,247,.1)' : '';
      
      const medal = ['🥇', '🥈', '🥉'][idx] || '•';
      tr.innerHTML = `
        <td style="text-align:center;font-weight:700;font-size:1.2rem;">${medal}</td>
        <td style="font-weight:${isCurrentUser ? '700' : '500'};color:${isCurrentUser ? '#a855f7' : 'var(--on-surface)'};">${user.username}</td>
        <td style="text-align:right;"><span class="grade-badge">${user.average}%</span></td>
        <td style="text-align:right;color:var(--on-surface-var);">${user.count}</td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);
    container.appendChild(card);
  });
}

function renderAssessmentLeaderboard(subjects, assessments) {
  const container = $('leaderboard-content');
  
  Object.entries(subjects).forEach(([courseId, courseData]) => {
    const card = el('div', 'card', '');
    card.style.marginBottom = '1.5rem';
    
    card.innerHTML = `<div class="card-title">${courseData.courseCode} — ${courseData.courseName}</div>`;
    
    // Assessment types for this course
    const courseAssessments = assessments[courseId] || {};
    Object.entries(courseAssessments).forEach(([type, typeData]) => {
      const subCard = el('div', '');
      subCard.style.cssText = 'background:var(--surface-2);padding:1rem;border-radius:8px;margin-top:1rem;';
      subCard.innerHTML = `<div style="font-weight:600;margin-bottom:.8rem;font-size:.9rem;text-transform:uppercase;color:var(--on-surface-var);">${type}</div>`;
      
      const table = el('table', 'grades-table');
      table.style.width = '100%';
      
      const thead = el('thead');
      thead.innerHTML = `
        <tr>
          <th style="text-align:center;">Rank</th>
          <th>Name</th>
          <th style="text-align:right;">Average</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = el('tbody');
      typeData.rankings.slice(0, 5).forEach((user, idx) => {
        const isCurrentUser = user.username === state.user;
        const tr = el('tr');
        
        const medal = ['🥇', '🥈', '🥉'][idx] || '•';
        tr.innerHTML = `
          <td style="text-align:center;">${medal}</td>
          <td style="font-weight:${isCurrentUser ? '700' : '500'};color:${isCurrentUser ? '#a855f7' : 'var(--on-surface)'};">${user.username}</td>
          <td style="text-align:right;"><span class="grade-badge">${user.average}%</span></td>
        `;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      subCard.appendChild(table);
      card.appendChild(subCard);
    });
    
    container.appendChild(card);
  });
}

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize authentication UI
  initializeAuth();
  
  // Keyboard shortcut
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if (e.ctrlKey && e.key === 'g') { e.preventDefault(); openModal(); }
  });

  // Tooltip logic
  document.querySelectorAll('[data-tooltip]').forEach(el => {
    el.addEventListener('mouseenter', e => {
      const tip = document.createElement('div');
      tip.className = 'tooltip';
      tip.textContent = el.dataset.tooltip;
      document.body.appendChild(tip);
      const r = el.getBoundingClientRect();
      tip.style.left = r.left + r.width / 2 - tip.offsetWidth / 2 + 'px';
      tip.style.top = r.top - tip.offsetHeight - 6 + 'px';
      el._tip = tip;
    });
    el.addEventListener('mouseleave', () => {
      if (el._tip) { el._tip.remove(); el._tip = null; }
    });
  });
});


/* ─── Course Modal ─── */
function openCourseModal() {
  $('course-modal-overlay').classList.add('open');
}

function closeCourseModal() {
  $('course-modal-overlay').classList.remove('open');
  ['c-code', 'c-name'].forEach(id => { $(id).value = ''; });
  $('c-credits').value = '3';
}

function closeCourseModalOutside(e) {
  if (e.target.id === 'course-modal-overlay') closeCourseModal();
}

async function submitCourse() {
  const code = $('c-code').value.trim();
  const name = $('c-name').value.trim();
  const credits = parseInt($('c-credits').value) || 3;
  const color = $('c-color').value;

  if (!code || !name) {
    showToast('Please fill in all fields.', 'error');
    return;
  }

  try {
    const { error } = await supabase
      .from('courses')
      .insert({
        id: Date.now(),
        code,
        name,
        credits,
        color,
        added_by: state.user,
        added_at: new Date().toISOString()
      });

    if (error) throw error;

    const newCourse = {
      id: Date.now(),
      code,
      name,
      credits,
      color
    };

    state.courses.push(newCourse);
    closeCourseModal();
    showToast(`Course "${code}" added!`, 'success');

    if (state.activePage === 'courses') renderCourses();
    if (state.activePage === 'dashboard') initDashboard();
    if (state.activePage === 'grades') renderGrades();

  } catch (err) {
    showToast('Failed to add course', 'error');
    console.error(err);
  }
}

/* ─── Profile Modal ─── */
function openProfileModal() {
  const modal = $('profile-modal-overlay');
  modal.style.display = 'flex';
  // Load current profile picture
  loadProfilePic();
}

function closeProfileModal() {
  const modal = $('profile-modal-overlay');
  modal.style.display = 'none';
}

function closeProfileModalOutside(event) {
  if (event.target.id === 'profile-modal-overlay') {
    closeProfileModal();
  }
}

function previewProfilePic() {
  const file = $('profile-file').files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      $('profile-preview-img').src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

async function uploadProfilePic() {
  const file = $('profile-file').files[0];
  if (!file) {
    showToast('Please select an image first', 'error');
    return;
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${state.user}_profile.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('profile-pictures')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data } = supabaseClient.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    // Update profile picture in UI
    $('profile-img').src = data.publicUrl;
    
    // Save to user profile (you might want to store this in a users table)
    showToast('Profile picture updated!', 'success');
    closeProfileModal();

  } catch (err) {
    showToast('Failed to upload profile picture', 'error');
    console.error(err);
  }
}

async function loadProfilePic() {
  try {
    // Try to get user's profile picture
    const fileName = `${state.user}_profile`;
    const { data, error } = await supabaseClient.storage
      .from('profile-pictures')
      .list('', {
        search: fileName
      });

    if (data && data.length > 0) {
      const file = data[0];
      const { data: urlData } = supabaseClient.storage
        .from('profile-pictures')
        .getPublicUrl(file.name);
      
      $('profile-img').src = urlData.publicUrl;
      $('profile-preview-img').src = urlData.publicUrl;
    }
  } catch (err) {
    console.log('No profile picture found, using default');
  }
}

/* ── Mobile Sidebar Toggle ─── */
function toggleSidebar() {
  const sidebar = $('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('mobile-open');
  }
}

/* ── Close sidebar when navigation item clicked ─── */
document.addEventListener('DOMContentLoaded', function() {
  const navItems = document.querySelectorAll('.nav-item button');
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      const sidebar = $('sidebar');
      if (sidebar && window.innerWidth <= 1024) {
        sidebar.classList.remove('mobile-open');
      }
    });
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', function(event) {
    const sidebar = $('sidebar');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    if (sidebar && menuBtn && window.innerWidth <= 1024) {
      if (!sidebar.contains(event.target) && !menuBtn.contains(event.target)) {
        sidebar.classList.remove('mobile-open');
      }
    }
  });
});
