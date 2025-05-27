// 存储自定义的请求规则
let customRules = [];
let nextRuleId = 1000; // 从较大的数字开始，避免冲突
let db = null;

// 确保数据库连接可用
async function ensureDBConnection() {
  if (!db) {
    await initDB();
  }
  return db;
}

// 初始化 IndexedDB
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HappyProxyDB', 1);

    request.onerror = () => {
      console.error('Error opening database');
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('Database opened successfully');
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('rules')) {
        db.createObjectStore('rules', { keyPath: 'id' });
      }
    };
  });
}

// 从 IndexedDB 获取所有规则
async function getAllRules() {
  await ensureDBConnection();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['rules'], 'readonly');
    const store = transaction.objectStore('rules');
    const request = store.getAll();

    request.onsuccess = () => {
      console.log('Retrieved rules from IndexedDB:', request.result);
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Error getting rules from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

// 保存规则到 IndexedDB
async function saveRule(rule) {
  await ensureDBConnection();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['rules'], 'readwrite');
    const store = transaction.objectStore('rules');
    const request = store.put(rule);

    request.onsuccess = () => {
      console.log('Rule saved to IndexedDB:', rule);
      resolve();
    };

    request.onerror = () => {
      console.error('Error saving rule to IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

// 从 IndexedDB 删除规则
async function deleteRule(ruleId) {
  await ensureDBConnection();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['rules'], 'readwrite');
    const store = transaction.objectStore('rules');
    const request = store.delete(ruleId);

    request.onsuccess = () => {
      console.log('Rule deleted from IndexedDB:', ruleId);
      resolve();
    };

    request.onerror = () => {
      console.error('Error deleting rule from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.type === 'ADD_RULE') {
    addRule(request.rule)
      .then(() => {
        console.log('Rule added successfully, sending response');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error adding rule:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放
  } 
  else if (request.type === 'GET_RULES') {
    getAllRules()
      .then(rules => {
        console.log('Sending current rules:', rules);
        sendResponse({ rules: rules });
      })
      .catch(error => {
        console.error('Error getting rules:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放
  } 
  else if (request.type === 'REMOVE_RULE') {
    console.log('Received REMOVE_RULE request:', request);
    removeRule(request.ruleId)
      .then(() => {
        console.log('Rule removed successfully, sending response');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error removing rule:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放
  }
  else if (request.type === 'UPDATE_RULE') {
    updateRule(request.ruleId, request.responseData, request.tag)
      .then(() => {
        console.log('Rule updated successfully, sending response');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error updating rule:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放
  }
  else if (request.type === 'TOGGLE_RULE_ENABLED') {
    toggleRuleEnabled(request.ruleId, request.enabled)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked');
  try {
    // 打开侧边栏
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.error('Error opening side panel:', error);
  }
});

// 获取所有现有规则的 ID
async function getExistingRuleIds() {
  try {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    return rules.map(rule => rule.id);
  } catch (error) {
    console.error('Error getting existing rule IDs:', error);
    return [];
  }
}

// 获取下一个可用的规则 ID
async function getNextAvailableRuleId() {
  const existingIds = await getExistingRuleIds();
  let newId = nextRuleId;
  
  while (existingIds.includes(newId)) {
    newId++;
  }
  
  nextRuleId = newId + 1;
  return newId;
}

// 压缩响应数据
function compressResponseData(data) {
  try {
    // 如果是 JSON 字符串，先解析再压缩
    const parsed = JSON.parse(data);
    return JSON.stringify(parsed);
  } catch {
    // 如果不是 JSON，直接返回原数据
    return data;
  }
}

// 添加新的规则
async function addRule(rule) {
  console.log('Adding rule:', rule);

  // 获取下一个可用的规则 ID
  const ruleId = await getNextAvailableRuleId();
  console.log('Generated rule ID:', ruleId);

  // 压缩响应数据
  const compressedResponse = compressResponseData(rule.responseData);

  // 创建规则对象
  const newRule = {
    id: ruleId,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: {
        url: `data:application/json,${encodeURIComponent(compressedResponse)}`
      }
    },
    condition: {
      urlFilter: rule.urlPattern,
      resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'other']
    }
  };

  // 创建要存储的规则对象，增加 enabled 字段
  const ruleToStore = {
    id: ruleId,
    urlPattern: rule.urlPattern,
    responseData: compressedResponse,
    enabled: rule.enabled !== false, // 默认 true
    tag: rule.tag || '' // 添加 tag 字段
  };

  // 保存到 IndexedDB
  await saveRule(ruleToStore);
  
  // 只有 enabled 才添加到 Chrome 的规则系统
  if (ruleToStore.enabled) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [],
      addRules: [newRule]
    });
  }

  // 更新内存中的规则列表
  customRules.push(ruleToStore);

  console.log('Rule added successfully:', ruleId);
}

// 新增：切换规则启用状态
async function toggleRuleEnabled(ruleId, enabled) {
  // 获取所有规则
  const rules = await getAllRules();
  const rule = rules.find(r => r.id === ruleId);
  if (!rule) throw new Error('Rule not found');
  rule.enabled = enabled;
  await saveRule(rule);

  // 更新 Chrome 的规则系统
  // 先移除该规则
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ruleId],
    addRules: []
  });
  // 如果启用则重新添加
  if (enabled) {
    const compressedResponse = compressResponseData(rule.responseData);
    const newRule = {
      id: ruleId,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          url: `data:application/json,${encodeURIComponent(compressedResponse)}`
        }
      },
      condition: {
        urlFilter: rule.urlPattern,
        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'other']
      }
    };
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [],
      addRules: [newRule]
    });
  }
}

// 更新规则
async function updateRule(ruleId, newResponseData, newTag) {
  console.log('Updating rule:', { ruleId, newResponseData, newTag });
  
  // 获取现有规则
  const rules = await getAllRules();
  const rule = rules.find(r => r.id === ruleId);
  
  if (!rule) {
    throw new Error('Rule not found');
  }

  // 压缩响应数据
  const compressedResponse = compressResponseData(newResponseData);

  // 更新规则对象
  const updatedRule = {
    ...rule,
    responseData: compressedResponse,
    tag: newTag
  };

  // 保存到 IndexedDB
  await saveRule(updatedRule);
  
  // 如果规则是启用的，更新 Chrome 的规则系统
  if (rule.enabled) {
    // 创建新的规则对象
    const chromeRule = {
      id: ruleId,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          url: `data:application/json,${encodeURIComponent(compressedResponse)}`
        }
      },
      condition: {
        urlFilter: rule.urlPattern,
        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'other']
      }
    };

    // 更新规则
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId],
      addRules: [chromeRule]
    });
  }
}

// 移除规则
async function removeRule(ruleId) {
  console.log('Removing rule:', ruleId);

  // 从 IndexedDB 删除规则
  await deleteRule(ruleId);
  
  // 从规则列表中删除
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ruleId],
    addRules: []
  });
  
  // 更新内存中的规则列表
  customRules = customRules.filter(rule => rule.id !== ruleId);
  
  console.log('Rule removed successfully:', ruleId);
}

const shouldClearOldData = false
// 初始化
chrome.runtime.onInstalled.addListener(async () => {
  try {
    console.log('Extension installing/updating...');

    // 初始化 IndexedDB
    await initDB();

    if(shouldClearOldData){
      // 获取所有现有规则的 ID
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const existingRuleIds = existingRules.map(rule => rule.id);
      console.log('Existing rule IDs:', existingRuleIds);
  
      // 清除所有现有规则
      if (existingRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: existingRuleIds,
          addRules: []
        });
        console.log('Cleared all existing rules');
      }
  
      // 清空 IndexedDB 中的规则
      const transaction = db.transaction(['rules'], 'readwrite');
      const store = transaction.objectStore('rules');
      await store.clear();
      console.log('Cleared IndexedDB rules');
  
      // 重置内存中的规则列表
      customRules = [];
      nextRuleId = 1000;
    }

 
    
    console.log('Extension initialized successfully');
  } catch (error) {
    console.error('Error initializing extension:', error);
  }
}); 