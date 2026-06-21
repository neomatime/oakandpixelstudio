/* ── Projects ── */
async function loadProjects() {
  const board = $('projects-board');
  if (board) board.innerHTML = skelKanban();
  const { data, error } = await sb.from('projects')
    .select('*,client:client_id(company,full_name)')
    .order('sort_order')
    .order('created_at', { ascending: false });
  if (error) {
    if (board) board.innerHTML = emptyState('Projects unavailable', 'Apply the projects schema migration to enable the Kanban board.');
    return;
  }
  allProjects = data || [];
  renderProjects();
}

function renderProjectClientFilter() {
  const select = $('project-client-filter');
  if (!select) return;
  const current = select.value || 'all';
  select.innerHTML = '<option value="all">All clients</option>' + allClients.map(c =>
    `<option value="${c.id}">${esc(c.company || c.full_name || 'Unnamed client')}</option>`
  ).join('');
  select.value = [...select.options].some(o => o.value === current) ? current : 'all';
}

function projectClientName(project) {
  return project.client?.company || project.client?.full_name || allClients.find(c => c.id === project.client_id)?.company || 'No client';
}

function projectClient(project) {
  return allClients.find(c => c.id === project.client_id) || project.client || {};
}

function renderProjects() {
  const board = $('projects-board');
  if (!board) return;
  let projects = allProjects;
  if (projectSearch) {
    const q = projectSearch.toLowerCase();
    projects = projects.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      projectClientName(p).toLowerCase().includes(q) ||
      (p.tags || []).join(' ').toLowerCase().includes(q)
    );
  }
  if (projectClientFilter !== 'all') projects = projects.filter(p => p.client_id === projectClientFilter);
  if (projectPriorityFilter !== 'all') projects = projects.filter(p => (p.priority || 'Medium') === projectPriorityFilter);
  const columns = projectStatusFilter === 'all'
    ? PROJECT_COLUMNS
    : PROJECT_COLUMNS.filter(([status]) => status === projectStatusFilter);

  board.innerHTML = columns.map(([status, label]) => {
    const items = projects.filter(p => (p.status || 'backlog') === status);
    return `<section class="kanban-col" data-status="${status}">
      <div class="kanban-col-head">
        <span class="kanban-title">${label}</span>
        <div style="display:flex;align-items:center;gap:.4rem;">
          <button class="kanban-add-task" data-status="${status}" type="button">New Task</button>
          <span class="kanban-count">${items.length}</span>
        </div>
      </div>
      <div class="kanban-list" data-status="${status}">
        ${items.map(projectCard).join('') || `<div class="empty-state" style="padding:1.5rem .5rem">No tasks</div>`}
      </div>
    </section>`;
  }).join('');
  wireProjectCards();
}

function projectCard(p) {
  const tags = Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  const pri = (p.priority || 'medium').toLowerCase();
  const linkedClient = projectClient(p);
  return `<article class="project-card" draggable="true" data-id="${p.id}">
    <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.45rem">${p.client_id ? clientAvatar(linkedClient) : ''}<div class="project-title" style="margin-bottom:0">${esc(p.title)}</div></div>
    <div class="project-desc">${esc(p.description || 'No description.')}</div>
    <div class="project-meta">
      <span class="project-pill priority-${pri}">${esc(p.priority || 'Medium')}</span>
      <span class="project-pill">${esc(projectClientName(p))}</span>
      <span class="project-pill">${p.due_date ? compactDate(p.due_date) : 'No due date'}</span>
      <span class="project-pill">${esc(p.owner || 'Unassigned')}</span>
    </div>
    ${tags.length ? `<div class="project-tags">${tags.map(t => `<span class="project-tag">${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="project-actions">
      <button class="act-btn edit-project" data-id="${p.id}">Edit</button>
      ${(p.status||'').toLowerCase()==='done' ? `<button class="act-btn" onclick="downloadProjectCompletionPDF('${p.id}')">Completion Report</button>` : ''}
      <button class="act-btn delete delete-project" data-id="${p.id}">Delete</button>
    </div>
  </article>`;
}

function wireProjectCards() {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', card.dataset.id);
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });
  document.querySelectorAll('.kanban-col').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', async e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      const status = col.dataset.status;
      const { error } = await sb.from('projects').update({ status }).eq('id', id);
      if (error) { toast('Error moving project.'); return; }
      toast('Project moved.');
      loadProjects();
    });
  });
  document.querySelectorAll('.edit-project').forEach(btn => btn.addEventListener('click', () => openProjectModal(btn.dataset.id)));
  document.querySelectorAll('.delete-project').forEach(btn => btn.addEventListener('click', () => deleteProject(btn.dataset.id)));
  document.querySelectorAll('.kanban-add-task').forEach(btn => btn.addEventListener('click', () => openProjectModal(null, btn.dataset.status)));
}

function openProjectModal(id = null, defaultStatus = 'backlog', defaultClientId = '') {
  const p = id ? allProjects.find(project => project.id === id) : {};
  const tags = Array.isArray(p?.tags) ? p.tags.join(', ') : (p?.tags || '');
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">${id ? 'Edit Task' : 'New Task'}</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full"><label>Task Title</label><input id="pr-title" value="${esc(p?.title)}"></div>
      <div class="modal-field full"><label>Description</label><input id="pr-desc" value="${esc(p?.description)}"></div>
      <div class="modal-field"><label>Associated Client</label><select id="pr-client"><option value="">No client</option>${allClients.map(c => `<option value="${c.id}"${(p?.client_id || defaultClientId) === c.id ? ' selected' : ''}>${esc(c.company || c.full_name)}</option>`).join('')}</select></div>
      <div class="modal-field"><label>Status</label><select id="pr-status">${PROJECT_COLUMNS.map(([value,label]) => `<option value="${value}"${(p?.status || defaultStatus) === value ? ' selected' : ''}>${label}</option>`).join('')}</select></div>
      <div class="modal-field"><label>Priority</label><select id="pr-priority">${['Low','Medium','High','Urgent'].map(v => `<option value="${v}"${(p?.priority || 'Medium') === v ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="modal-field"><label>Due Date</label><input id="pr-due" type="date" value="${esc(p?.due_date)}"></div>
      <div class="modal-field"><label>Assigned Owner</label><input id="pr-owner" value="${esc(p?.owner)}" placeholder="Neo"></div>
      <div class="modal-field"><label>Tags / Categories</label><input id="pr-tags" value="${esc(tags)}" placeholder="website, portal"></div>
    </div>
    <div class="modal-foot">
      <div></div>
      <div class="modal-foot-right">
        <button class="btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn-add" onclick="saveProject('${id || ''}')">${id ? 'Save Task' : 'Create Task'}</button>
      </div>
    </div>
  `);
  $('modal-box').classList.add('wide');
}

async function saveProject(id = '') {
  const saveBtn = document.querySelector('#modal-box .btn-add');
  btnLoad(saveBtn, true, id ? 'Saving…' : 'Creating…');
  const payload = {
    title:       $('pr-title').value.trim(),
    description: $('pr-desc').value.trim() || null,
    client_id:   $('pr-client').value || null,
    status:      $('pr-status').value,
    priority:    $('pr-priority').value,
    due_date:    $('pr-due').value || null,
    owner:       $('pr-owner').value.trim() || null,
    tags:        $('pr-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    sort_order:  99
  };
  if (!payload.title) { btnLoad(saveBtn, false); toast('Task title is required.'); return; }
  const query = id ? sb.from('projects').update(payload).eq('id', id) : sb.from('projects').insert(payload);
  const { error } = await query;
  if (error) { btnLoad(saveBtn, false); toast('Error saving task. Apply the projects schema migration first.'); return; }
  closeModal();
  toast(id ? 'Task updated.' : 'Task created.');
  loadProjects();
}

async function deleteProject(id) {
  const project = allProjects.find(p => p.id === id) || {};
  const confirmed = await opsDeleteConfirm({
    title: 'Delete Task?',
    message: 'This task will be permanently removed from the Projects workspace.',
    meta: project.title || 'Untitled task',
    confirmText: 'Delete Task'
  });
  if (!confirmed) return;
  const { error } = await sb.from('projects').delete().eq('id', id);
  if (error) { toast('Error deleting task.'); return; }
  toast('Task deleted.');
  loadProjects();
}

$('project-search')?.addEventListener('input', e => {
  projectSearch = e.target.value.trim();
  renderProjects();
});
$('project-client-filter')?.addEventListener('change', e => {
  projectClientFilter = e.target.value;
  renderProjects();
});
$('project-priority-filter')?.addEventListener('change', e => {
  projectPriorityFilter = e.target.value;
  renderProjects();
});
$('project-status-filter')?.addEventListener('change', e => {
  projectStatusFilter = e.target.value;
  renderProjects();
});
$('add-project-btn')?.addEventListener('click', () => openProjectModal(null, projectStatusFilter === 'all' ? 'backlog' : projectStatusFilter));

