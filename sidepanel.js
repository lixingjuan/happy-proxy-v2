document.addEventListener('DOMContentLoaded', () => {
  const urlPatternInput = document.getElementById('urlPattern');
  const ruleTagInput = document.getElementById('ruleTag');
  const responseDataInput = document.getElementById('responseData');
  const addRuleButton = document.getElementById('addRule');
  const ruleList = document.getElementById('ruleList');
  const editModal = document.getElementById('editModal');
  const closeEditModal = document.getElementById('closeEditModal');
  const editUrl = document.getElementById('editUrl');
  const editTag = document.getElementById('editTag');
  const editResponseData = document.getElementById('editResponseData');
  const saveEditButton = document.getElementById('saveEdit');
  const formatJsonButton = document.getElementById('formatJson');
  const jsonError = document.getElementById('jsonError');
  const searchInput = document.getElementById('searchInput');

  let currentEditingRule = null;
  let editor = null;
  let allRules = []; // 存储所有规则

  // 初始化 CodeMirror 编辑器
  function initEditor() {
    editor = CodeMirror.fromTextArea(editResponseData, {
      mode: 'application/json',
      theme: 'monokai',
      lineNumbers: true,
      autoCloseBrackets: true,
      matchBrackets: true,
      indentUnit: 2,
      tabSize: 2,
      lineWrapping: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
      extraKeys: {
        'Ctrl-Space': 'autocomplete',
        'Ctrl-/': 'toggleComment',
        'Ctrl-F': function(cm) {
          // 阻止浏览器默认的搜索行为
          event.preventDefault();
          event.stopPropagation();
          editor.execCommand('findPersistent');
        },
        'Ctrl-H': function(cm) {
          // 阻止浏览器默认的搜索行为
          event.preventDefault();
          event.stopPropagation();
          editor.execCommand('replace');
        },
        'Ctrl-Z': 'undo',
        'Ctrl-Y': 'redo',
        'Ctrl-A': 'selectAll',
        'Ctrl-S': function(cm) {
          saveEdit();
        }
      }
    });

    // 初始化搜索插件
    CodeMirror.commands.findPersistent = function(cm) {
      // 创建搜索对话框
      var dialog = document.createElement('div');
      dialog.className = 'CodeMirror-dialog';
      dialog.style.position = 'absolute';
      dialog.style.top = '10px';
      dialog.style.right = '10px';
      dialog.style.background = 'rgba(255, 255, 255, 0.8)';
      dialog.style.padding = '8px';
      dialog.style.borderRadius = '4px';
      dialog.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      dialog.style.zIndex = '1000';
      dialog.style.display = 'flex';
      dialog.style.alignItems = 'center';
      dialog.style.gap = '8px';
      
      // 创建搜索输入框
      var input = document.createElement('input');
      input.type = 'text';
      input.style.width = '200px';
      input.style.padding = '4px 8px';
      input.style.border = '1px solid #ddd';
      input.style.borderRadius = '4px';
      input.style.fontSize = '14px';
      
      // 创建搜索按钮
      var searchButton = document.createElement('button');
      searchButton.textContent = '搜索';
      searchButton.style.background = '#2196F3';
      searchButton.style.color = 'white';
      searchButton.style.border = 'none';
      searchButton.style.padding = '2px 4px';
      searchButton.style.borderRadius = '4px';
      searchButton.style.cursor = 'pointer';
      searchButton.style.fontSize = '12px';
      
      // 创建下一个按钮
      var nextButton = document.createElement('button');
      nextButton.textContent = '下一个';
      nextButton.style.background = '#4CAF50';
      nextButton.style.color = 'white';
      nextButton.style.border = 'none';
      nextButton.style.padding = '2px 4px';
      nextButton.style.borderRadius = '4px';
      nextButton.style.cursor = 'pointer';
      nextButton.style.fontSize = '12px';
      
      // 创建关闭按钮
      var closeButton = document.createElement('button');
      closeButton.textContent = '×';
      closeButton.style.background = 'none';
      closeButton.style.border = 'none';
      closeButton.style.color = '#666';
      closeButton.style.fontSize = '18px';
      closeButton.style.cursor = 'pointer';
      closeButton.style.padding = '0 4px';
      closeButton.style.marginLeft = '4px';
      
      // 添加到对话框
      dialog.appendChild(input);
      dialog.appendChild(searchButton);
      dialog.appendChild(nextButton);
      dialog.appendChild(closeButton);
      
      // 将对话框添加到编辑器容器中
      cm.getWrapperElement().appendChild(dialog);
      
      // 聚焦输入框
      input.focus();
      
      // 搜索函数
      function search() {
        var query = input.value;
        if (!query) return;
        
        try {
          // 获取当前编辑器内容
          var content = cm.getValue();
          var index = content.indexOf(query);
          
          if (index !== -1) {
            // 计算行号和列号
            var lines = content.substring(0, index).split('\n');
            var line = lines.length - 1;
            var ch = lines[lines.length - 1].length;
            
            // 设置选中区域
            cm.setSelection(
              {line: line, ch: ch},
              {line: line, ch: ch + query.length}
            );
            
            // 添加自定义样式
            cm.addOverlay({
              token: function(stream) {
                if (stream.string.indexOf(query, stream.pos) === stream.pos) {
                  stream.pos += query.length;
                  return "search-match";
                }
                stream.next();
                return null;
              }
            });
            
            // 滚动到选中区域
            cm.scrollIntoView({line: line, ch: ch}, 50);
            
            // 聚焦编辑器
            cm.focus();
          } else {
            alert('没有找到匹配项');
          }
        } catch (e) {
          console.error('Search error:', e);
          alert('搜索出错：' + e.message);
        }
      }
      
      // 查找下一个匹配项
      function findNext() {
        var query = input.value;
        if (!query) return;
        
        try {
          // 获取当前选中区域
          var selection = cm.getSelection();
          var cursor = cm.getCursor();
          
          // 获取当前编辑器内容
          var content = cm.getValue();
          
          // 从当前光标位置开始搜索
          var searchStart = cm.indexFromPos(cursor);
          var index = content.indexOf(query, searchStart + 1);
          
          if (index === -1) {
            // 如果没找到，从头开始搜索
            index = content.indexOf(query);
          }
          
          if (index !== -1) {
            // 计算行号和列号
            var lines = content.substring(0, index).split('\n');
            var line = lines.length - 1;
            var ch = lines[lines.length - 1].length;
            
            // 设置选中区域
            cm.setSelection(
              {line: line, ch: ch},
              {line: line, ch: ch + query.length}
            );
            
            // 滚动到选中区域
            cm.scrollIntoView({line: line, ch: ch}, 50);
            
            // 聚焦编辑器
            cm.focus();
          } else {
            alert('没有找到更多匹配项');
          }
        } catch (e) {
          console.error('Search error:', e);
          alert('搜索出错：' + e.message);
        }
      }
      
      // 关闭对话框
      function closeDialog() {
        cm.getWrapperElement().removeChild(dialog);
        // 移除搜索高亮
        cm.removeOverlay();
      }
      
      // 绑定事件
      searchButton.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        search();
      };
      
      nextButton.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        findNext();
      };
      
      closeButton.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
      };
      
      input.onkeyup = function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          search();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closeDialog();
        }
      };
    };

    // 添加搜索按钮
    const searchButton = document.createElement('button');
    searchButton.textContent = '搜索 (⌘F)';
    searchButton.className = 'format-btn';
    searchButton.style.marginRight = '8px';
    searchButton.onclick = function() {
      editor.execCommand('findPersistent');
    };
    formatJsonButton.parentNode.insertBefore(searchButton, formatJsonButton);

    // 添加全局快捷键监听
    document.addEventListener('keydown', function(e) {
      // 检查是否在编辑器中
      if (document.activeElement === editor.getInputField()) {
        // 如果按下 Cmd+F (Mac) 或 Ctrl+F (Windows/Linux)
        if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
          e.preventDefault();
          e.stopPropagation();
          editor.execCommand('findPersistent');
        }
        // 如果按下 Cmd+H (Mac) 或 Ctrl+H (Windows/Linux)
        else if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
          e.preventDefault();
          e.stopPropagation();
          editor.execCommand('replace');
        }
      }
    });

    // 添加错误检查
    editor.on('change', function() {
      try {
        JSON.parse(editor.getValue());
        jsonError.classList.remove('visible');
      } catch (e) {
        jsonError.textContent = '无效的 JSON 格式：' + e.message;
        jsonError.classList.add('visible');
      }
    });
  }

  // 格式化 JSON
  function formatJSON() {
    try {
      const value = editor.getValue();
      const formatted = JSON.stringify(JSON.parse(value), null, 2);
      editor.setValue(formatted);
      jsonError.classList.remove('visible');
    } catch (e) {
      jsonError.textContent = '无效的 JSON 格式：' + e.message;
      jsonError.classList.add('visible');
    }
  }

  // 加载现有规则
  function loadRules() {
    chrome.runtime.sendMessage({ type: 'GET_RULES' }, (response) => {
      console.log('Received rules response:', response);
      if (response && response.rules) {
        allRules = response.rules; // 更新 allRules
        displayRules(response.rules);
      }
    });
  }

  // 显示规则列表
  function displayRules(rules) {
    console.log('Displaying rules:', rules);
    ruleList.innerHTML = '';

    // 将规则分为本地和远程两组
    const localRules = rules.filter(rule => rule.urlPattern.toLowerCase().startsWith('http://localhost'));
    const remoteRules = rules.filter(rule => !rule.urlPattern.toLowerCase().startsWith('http://localhost'));

    // 显示远程规则
    if (remoteRules.length > 0) {
      const remoteHeader = document.createElement('div');
      remoteHeader.className = 'rule-section-header';
      remoteHeader.textContent = '远程规则';
      ruleList.appendChild(remoteHeader);

      remoteRules.forEach(rule => {
        const ruleElement = createRuleElement(rule);
        ruleList.appendChild(ruleElement);
      });
    }

    // 如果有远程规则和本地规则，添加分隔线
    if (remoteRules.length > 0 && localRules.length > 0) {
      const divider = document.createElement('div');
      divider.className = 'rule-divider';
      ruleList.appendChild(divider);
    }

    // 显示本地规则
    if (localRules.length > 0) {
      const localHeader = document.createElement('div');
      localHeader.className = 'rule-section-header';
      localHeader.textContent = '本地规则';
      ruleList.appendChild(localHeader);

      localRules.forEach(rule => {
        const ruleElement = createRuleElement(rule);
        ruleList.appendChild(ruleElement);
      });
    }
  }

  // 创建规则元素
  function createRuleElement(rule) {
    const ruleElement = document.createElement('div');
    ruleElement.className = 'rule-item';
    
    const ruleInfo = document.createElement('div');
    ruleInfo.className = 'rule-info';
    
    const urlElement = document.createElement('div');
    urlElement.className = 'rule-url';
    urlElement.textContent = rule.urlPattern;
    
    if (rule.tag) {
      const tagElement = document.createElement('span');
      tagElement.className = 'rule-tag';
      tagElement.textContent = rule.tag;
      urlElement.appendChild(tagElement);
    }
    
    const responseElement = document.createElement('div');
    responseElement.className = 'rule-response';
    responseElement.textContent = rule.responseData;
    
    // 新增：启用开关
    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'toggle-switch';
    toggleSwitch.title = '启用/禁用此规则';
    
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = rule.enabled !== false;
    toggleInput.onchange = () => {
      chrome.runtime.sendMessage({
        type: 'TOGGLE_RULE_ENABLED',
        ruleId: rule.id,
        enabled: toggleInput.checked
      }, (response) => {
        if (response && response.success) {
          loadRules();
        } else {
          alert('切换规则状态失败：' + (response?.error || '未知错误'));
          // 恢复原状态
          toggleInput.checked = !toggleInput.checked;
        }
      });
    };
    
    const toggleSlider = document.createElement('span');
    toggleSlider.className = 'toggle-slider';
    
    toggleSwitch.appendChild(toggleInput);
    toggleSwitch.appendChild(toggleSlider);
    
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
    
    buttonGroup.appendChild(toggleSwitch);
    buttonGroup.appendChild(editButton);
    buttonGroup.appendChild(deleteButton);
    
    ruleInfo.appendChild(urlElement);
    ruleInfo.appendChild(responseElement);
    ruleElement.appendChild(ruleInfo);
    ruleElement.appendChild(buttonGroup);
    
    return ruleElement;
  }

  // 打开编辑弹窗
  function openEditModal(rule) {
    currentEditingRule = rule;
    editUrl.textContent = rule.urlPattern;
    editTag.value = rule.tag || '';
    if (!editor) {
      initEditor();
    }
    editor.setValue(rule.responseData);
    formatJSON(); // 自动格式化 JSON
    editModal.classList.add('active');
    editor.refresh();
  }

  // 关闭编辑弹窗
  function closeModal() {
    editModal.classList.remove('active');
    currentEditingRule = null;
    if (editor) {
      editor.setValue('');
    }
    editTag.value = '';
  }

  // 保存编辑
  function saveEdit() {
    if (!currentEditingRule) return;

    const newResponseData = editor.getValue().trim();
    const newTag = editTag.value.trim();
    
    if (!newResponseData) {
      alert('请填写响应数据');
      return;
    }

    try {
      // 验证 JSON 格式
      JSON.parse(newResponseData);
    } catch (e) {
      if (!confirm('JSON 格式无效，是否仍要保存？')) {
        return;
      }
    }

    chrome.runtime.sendMessage({
      type: 'UPDATE_RULE',
      ruleId: currentEditingRule.id,
      responseData: newResponseData,
      tag: newTag
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
    const tag = ruleTagInput.value.trim();
    const responseData = responseDataInput.value.trim();

    if (!urlPattern || !responseData) {
      alert('请填写完整的规则信息');
      return;
    }

    try {
      // 验证 JSON 格式
      JSON.parse(responseData);
    } catch (e) {
      if (!confirm('JSON 格式无效，是否仍要保存？')) {
        return;
      }
    }

    console.log('Adding new rule:', { urlPattern, tag, responseData });

    chrome.runtime.sendMessage({
      type: 'ADD_RULE',
      rule: {
        urlPattern,
        tag,
        responseData
      }
    }, (response) => {
      console.log('Add rule response:', response);
      if (response && response.success) {
        urlPatternInput.value = '';
        ruleTagInput.value = '';
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
  formatJsonButton.addEventListener('click', formatJSON);
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      closeModal();
    }
  });

  // 添加搜索监听器
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredRules = allRules.filter(rule => {
      return rule.urlPattern.toLowerCase().includes(searchTerm) ||
             (rule.tag && rule.tag.toLowerCase().includes(searchTerm)) ||
             rule.responseData.toLowerCase().includes(searchTerm);
    });
    displayRules(filteredRules);
  });

  // 初始加载规则
  loadRules();
}); 


