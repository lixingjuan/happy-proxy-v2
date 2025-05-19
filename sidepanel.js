document.addEventListener('DOMContentLoaded', () => {
  const urlPatternInput = document.getElementById('urlPattern');
  const responseDataInput = document.getElementById('responseData');
  const addRuleButton = document.getElementById('addRule');
  const ruleList = document.getElementById('ruleList');
  const editModal = document.getElementById('editModal');
  const closeEditModal = document.getElementById('closeEditModal');
  const editUrl = document.getElementById('editUrl');
  const editResponseData = document.getElementById('editResponseData');
  const saveEditButton = document.getElementById('saveEdit');

  let currentEditingRule = null;

  // 加载现有规则
  function loadRules() {
    chrome.runtime.sendMessage({ type: 'GET_RULES' }, (response) => {
      console.log('Received rules response:', response);
      if (response && response.rules) {
        displayRules(response.rules);
      }
    });
  }

  // 显示规则列表
  function displayRules(rules) {
    console.log('Displaying rules:', rules);
    ruleList.innerHTML = '';
    rules.forEach(rule => {
      const ruleElement = document.createElement('div');
      ruleElement.className = 'rule-item';
      
      const ruleInfo = document.createElement('div');
      ruleInfo.className = 'rule-info';
      
      const urlElement = document.createElement('div');
      urlElement.className = 'rule-url';
      urlElement.textContent = rule.urlPattern;
      
      const responseElement = document.createElement('div');
      responseElement.className = 'rule-response';
      responseElement.textContent = rule.responseData;
      
      // 新增：启用开关
      const enabledLabel = document.createElement('label');
      enabledLabel.style.display = 'flex';
      enabledLabel.style.alignItems = 'center';
      enabledLabel.style.gap = '4px';
      enabledLabel.style.marginRight = '8px';
      const enabledCheckbox = document.createElement('input');
      enabledCheckbox.type = 'checkbox';
      enabledCheckbox.checked = rule.enabled !== false;
      enabledCheckbox.title = '启用/禁用此规则';
      enabledCheckbox.onchange = () => {
        chrome.runtime.sendMessage({
          type: 'TOGGLE_RULE_ENABLED',
          ruleId: rule.id,
          enabled: enabledCheckbox.checked
        }, (response) => {
          if (response && response.success) {
            loadRules();
          } else {
            alert('切换规则状态失败：' + (response?.error || '未知错误'));
            // 恢复原状态
            enabledCheckbox.checked = !enabledCheckbox.checked;
          }
        });
      };
      enabledLabel.appendChild(enabledCheckbox);
      enabledLabel.appendChild(document.createTextNode('启用'));
      
      const buttonGroup = document.createElement('div');
      buttonGroup.className = 'button-group';
      
      const editButton = document.createElement('button');
      editButton.className = 'edit-btn';
      editButton.textContent = '编辑';
      editButton.onclick = () => openEditModal(rule);
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-btn';
      deleteButton.textContent = '删除';
      deleteButton.onclick = () => removeRule(rule.id);
      
      buttonGroup.appendChild(enabledLabel);
      buttonGroup.appendChild(editButton);
      buttonGroup.appendChild(deleteButton);
      
      ruleInfo.appendChild(urlElement);
      ruleInfo.appendChild(responseElement);
      ruleElement.appendChild(ruleInfo);
      ruleElement.appendChild(buttonGroup);
      
      ruleList.appendChild(ruleElement);
    });
  }

  // 打开编辑弹窗
  function openEditModal(rule) {
    currentEditingRule = rule;
    editUrl.textContent = rule.urlPattern;
    editResponseData.value = rule.responseData;
    editModal.classList.add('active');
  }

  // 关闭编辑弹窗
  function closeModal() {
    editModal.classList.remove('active');
    currentEditingRule = null;
    editResponseData.value = '';
  }

  // 保存编辑
  function saveEdit() {
    if (!currentEditingRule) return;

    const newResponseData = editResponseData.value.trim();
    if (!newResponseData) {
      alert('请填写响应数据');
      return;
    }

    chrome.runtime.sendMessage({
      type: 'UPDATE_RULE',
      ruleId: currentEditingRule.id,
      responseData: newResponseData
    }, (response) => {
      console.log('Update rule response:', response);
      if (response && response.success) {
        closeModal();
        loadRules();
      } else {
        alert('更新规则失败，请查看控制台日志');
      }
    });
  }

  // 添加规则按钮点击事件
  addRuleButton.addEventListener('click', () => {
    const urlPattern = urlPatternInput.value.trim();
    const responseData = responseDataInput.value.trim();

    if (!urlPattern || !responseData) {
      alert('请填写完整的规则信息');
      return;
    }

    console.log('Adding new rule:', { urlPattern, responseData });

    chrome.runtime.sendMessage({
      type: 'ADD_RULE',
      rule: {
        urlPattern,
        responseData
      }
    }, (response) => {
      console.log('Add rule response:', response);
      if (response && response.success) {
        urlPatternInput.value = '';
        responseDataInput.value = '';
        loadRules();
      } else {
        alert('添加规则失败，请查看控制台日志');
      }
    });
  });

  // 移除规则
  function removeRule(ruleId) {
    console.log('Removing rule:', ruleId);
    if (!ruleId) {
      console.error('Invalid rule ID');
      return;
    }
    
    if (!confirm('确定要删除这条规则吗？')) {
      return;
    }
    
    chrome.runtime.sendMessage({
      type: 'REMOVE_RULE',
      ruleId: ruleId
    }, (response) => {
      console.log('Remove rule response:', response);
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        alert('删除规则失败：' + chrome.runtime.lastError.message);
        return;
      }
      
      if (response && response.success) {
        console.log('Rule removed successfully');
        loadRules();
      } else {
        console.error('Failed to remove rule:', response?.error);
        alert('删除规则失败：' + (response?.error || '未知错误'));
      }
    });
  }

  // 事件监听
  closeEditModal.addEventListener('click', closeModal);
  saveEditButton.addEventListener('click', saveEdit);
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      closeModal();
    }
  });

  // 初始加载规则
  loadRules();
}); 