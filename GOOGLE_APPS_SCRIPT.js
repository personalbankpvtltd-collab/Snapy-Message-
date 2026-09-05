/**
 * Snapy Backend - Google Apps Script
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open a Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Delete all code and paste this entire script.
 * 4. Click the "Run" button for the 'setup' function once to create all sheets.
 * 5. Click "Deploy" > "New Deployment".
 * 6. Select "Web App".
 * 7. Set "Execute as" to "Me" and "Who has access" to "Anyone".
 * 8. Copy the Web App URL and paste it into your app.
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

/**
 * Auto-setup function to create required sheets and headers.
 * Run this once from the Apps Script editor.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheets = {
    'users': ['uid', 'email', 'password', 'firstName', 'lastName', 'nickName', 'phoneNumber', 'displayName', 'photoURL', 'bio', 'status', 'lastSeen', 'createdAt', 'updatedAt', 'isPermanentlyBanned', 'reportCount', 'blockedUsers', 'username', 'banExpires'],
    'friendRequests': ['id', 'fromUid', 'toUid', 'status', 'createdAt', 'updatedAt'],
    'chats': ['id', 'participants', 'lastMessageText', 'lastMessageSenderUid', 'lastMessageCreatedAt', 'updatedAt'],
    'messages': ['id', 'chatId', 'senderUid', 'text', 'createdAt', 'read'],
    'admins': ['uid', 'email', 'password', 'role', 'createdAt'],
    'reports': ['id', 'reporterUid', 'reportedUid', 'reason', 'createdAt']
  };
  
  for (const [name, headers] of Object.entries(sheets)) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  
  // Add default super admin if none exists
  const adminSheet = ss.getSheetByName('admins');
  if (adminSheet.getLastRow() === 1) {
    adminSheet.appendRow(['admin-001', 'admin@snapy.com', 'admin123', 'super', new Date().toISOString()]);
  }
  
  return "Setup complete! All sheets and headers created. Default admin: admin@snapy.com / admin123";
}

/**
 * Helper to get a sheet by name, creating it if it doesn't exist.
 */
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    setup(); // Run setup if any sheet is missing
    sheet = ss.getSheetByName(name);
  }
  return sheet;
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'test') {
    return createResponse({ status: 'online', timestamp: new Date().toISOString() });
  }
  if (action === 'setup') {
    return createResponse({ message: setup() });
  }
  return createResponse({ message: 'Snapy Backend is Online' });
}

function doPost(e) {
  let data;
  try {
    if (!e) throw new Error('No event object received');
    
    // Try to parse the raw contents first
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        // Not JSON, maybe form data
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }
    
    // If the entire JSON was sent in a single parameter (e.g. 'payload')
    if (data && data.payload) {
      try {
        data = JSON.parse(data.payload);
      } catch (err) {}
    }
  } catch (err) {
    data = (e && e.parameter) ? e.parameter : {};
  }
  
  if (!data || !data.action) {
    return createErrorResponse('No action specified in request. Received: ' + JSON.stringify(data));
  }

  try {
    let result;
    switch (data.action) {
      case 'signup': result = signup(data); break;
      case 'login': result = login(data); break;
      case 'getProfile': result = getProfile(data.uid); break;
      case 'updateProfile': result = updateProfile(data.uid, data); break;
      case 'updateStatus': result = updateStatus(data.uid, data.status); break;
      case 'searchUsers': result = searchUsers(data.query); break;
      case 'sendFriendRequest': result = sendFriendRequest(data.fromUid, data.toUid); break;
      case 'getFriendRequests': result = getFriendRequests(data.uid); break;
      case 'respondToFriendRequest': result = respondToFriendRequest(data.requestId, data.status); break;
      case 'getFriends': result = getFriends(data.uid); break;
      case 'getChats': result = getChats(data.uid); break;
      case 'getUnreadMessages': result = getUnreadMessages(data.uid); break;
      case 'getMessages': result = getMessages(data.chatId, data.uid); break;
      case 'sendMessage': result = sendMessage(data.chatId, data.senderUid, data.text, data.messageId); break;
      case 'markAsRead': result = markAsRead(data.chatId, data.messageId); break;
      case 'markAllAsRead': result = markAllAsRead(data.chatId, data.uid); break;
      case 'cleanChatHistory': result = cleanChatHistory(data.chatId, data.uid); break;
      case 'unfriend': result = unfriend(data.uid, data.friendUid); break;
      case 'blockUser': result = blockUser(data.uid, data.blockedUid); break;
      case 'unblockUser': result = unblockUser(data.uid, data.blockedUid); break;
      case 'reportUser': result = reportUser(data.reporterUid, data.reportedUid, data.reason); break;
      case 'getOnlineUserCount': result = getOnlineUserCount(); break;
      case 'changePassword': result = changePassword(data.uid, data.oldPassword, data.newPassword); break;
      case 'changeUsername': result = changeUsername(data.uid, data.newUsername); break;
      case 'getAppStats': result = getAppStats(); break;
      case 'test': result = { status: 'online', timestamp: new Date().toISOString() }; break;
      
      // Admin Actions
      case 'adminLogin': result = adminLogin(data.email, data.password); break;
      case 'adminGetUsers': result = adminGetUsers(); break;
      case 'adminGetReports': result = adminGetReports(); break;
      case 'adminDeleteReport': result = adminDeleteReport(data.reportId); break;
      case 'adminBanUser': result = adminBanUser(data.uid, data.days); break;
      case 'adminUnbanUser': result = adminUnbanUser(data.uid); break;
      case 'adminAddAdmin': result = adminAddAdmin(data.email, data.password, data.role); break;
      case 'adminGetAdmins': result = adminGetAdmins(); break;
      case 'adminSendWarning': result = adminSendWarning(data.uid, data.message); break;
      
      default: throw new Error('Invalid action: ' + data.action);
    }
    return createResponse(result);
  } catch (error) {
    return createErrorResponse(error.message);
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- CORE FUNCTIONS ---

function signup(data) {
  const sheet = getSheet('users');
  const users = sheet.getDataRange().getValues();
  
  for (let i = 1; i < users.length; i++) {
    if (users[i][1] === data.email) throw new Error('Email already exists');
    if (data.username && users[i][17] === data.username) throw new Error('Username taken');
  }

  const uid = Utilities.getUuid();
  const now = new Date().toISOString();
  // uid, email, password, firstName, lastName, nickName, phoneNumber, displayName, photoURL, bio, status, lastSeen, createdAt, updatedAt, isPermanentlyBanned, reportCount, blockedUsers, username, banExpires
  const newUser = [uid, data.email, data.password || data.pass, data.firstName, data.lastName, data.nickName, data.phoneNumber, `${data.firstName} ${data.lastName}`, '', '', 'offline', now, now, now, false, 0, '[]', data.username || '', ''];
  
  sheet.appendRow(newUser);
  return { uid, email: data.email, username: data.username || '', displayName: newUser[7] };
}

function login(data) {
  const sheet = getSheet('users');
  const users = sheet.getDataRange().getValues();
  const password = data.password || data.pass;
  
  for (let i = 1; i < users.length; i++) {
    if (users[i][1] === data.email && users[i][2] === password) {
      // Check ban
      if (users[i][14] === true || users[i][14] === 'true') throw new Error('Your account is permanently banned.');
      if (users[i][18]) {
        const expires = new Date(users[i][18]);
        if (expires > new Date()) throw new Error('Your account is banned until ' + expires.toLocaleString());
      }

      const now = new Date().toISOString();
      sheet.getRange(i + 1, 11, 1, 2).setValues([['online', now]]);
      sheet.getRange(i + 1, 14).setValue(now);
      
      return parseUser(users[i]);
    }
  }
  throw new Error('Invalid credentials');
}

function getProfile(uid) {
  if (uid === 'SYSTEM') return { uid: 'SYSTEM', displayName: 'System Warning', photoURL: 'https://cdn-icons-png.flaticon.com/512/179/179386.png', status: 'online' };
  const sheet = getSheet('users');
  const users = sheet.getDataRange().getValues();
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === uid) return parseUser(users[i]);
  }
  throw new Error('User not found');
}

function parseUser(row) {
  let blocked = [];
  try { if (row[16]) blocked = JSON.parse(row[16]); } catch(e) {}
  return {
    uid: row[0], email: row[1], firstName: row[3], lastName: row[4], nickName: row[5],
    phoneNumber: row[6], displayName: row[7], photoURL: row[8], bio: row[9],
    status: row[10], isPermanentlyBanned: row[14] === true || row[14] === 'true',
    reportCount: parseInt(row[15]) || 0, blockedUsers: blocked, username: row[17] || '',
    banExpires: row[18] || ''
  };
}

function updateProfile(uid, data) {
  const sheet = getSheet('users');
  const users = sheet.getDataRange().getValues();
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === uid) {
      const row = i + 1;
      if (data.firstName) sheet.getRange(row, 4).setValue(data.firstName);
      if (data.lastName) sheet.getRange(row, 5).setValue(data.lastName);
      if (data.nickName) sheet.getRange(row, 6).setValue(data.nickName);
      if (data.phoneNumber) sheet.getRange(row, 7).setValue(data.phoneNumber);
      if (data.photoURL) sheet.getRange(row, 9).setValue(data.photoURL);
      if (data.bio) sheet.getRange(row, 10).setValue(data.bio);
      sheet.getRange(row, 8).setValue(`${data.firstName || users[i][3]} ${data.lastName || users[i][4]}`);
      sheet.getRange(row, 14).setValue(new Date().toISOString());
      return true;
    }
  }
  throw new Error('User not found');
}

function updateStatus(uid, status) {
  const sheet = getSheet('users');
  const users = sheet.getDataRange().getValues();
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === uid) {
      const now = new Date().toISOString();
      sheet.getRange(i + 1, 11, 1, 2).setValues([[status, now]]);
      sheet.getRange(i + 1, 14).setValue(now);
      return true;
    }
  }
  return false;
}

function searchUsers(query) {
  const sheet = getSheet('users');
  const users = sheet.getDataRange().getValues();
  const q = query.toLowerCase();
  return users.slice(1).filter(u => 
    u[1].toLowerCase().includes(q) || u[7].toLowerCase().includes(q) || (u[17] && u[17].toLowerCase().includes(q))
  ).map(u => ({ uid: u[0], email: u[1], displayName: u[7], photoURL: u[8], username: u[17] || '' }));
}

function sendFriendRequest(fromUid, toUid) {
  const sheet = getSheet('friendRequests');
  const reqs = sheet.getDataRange().getValues();
  for (let i = 1; i < reqs.length; i++) {
    if ((reqs[i][1] === fromUid && reqs[i][2] === toUid) || (reqs[i][1] === toUid && reqs[i][2] === fromUid)) {
      if (reqs[i][3] === 'pending') throw new Error('Request already pending');
      if (reqs[i][3] === 'accepted') throw new Error('Already friends');
    }
  }
  const now = new Date().toISOString();
  sheet.appendRow([Utilities.getUuid(), fromUid, toUid, 'pending', now, now]);
  return true;
}

function getFriendRequests(uid) {
  const sheet = getSheet('friendRequests');
  const reqs = sheet.getDataRange().getValues();
  const userSheet = getSheet('users');
  const users = userSheet.getDataRange().getValues();
  const userMap = {};
  users.forEach(u => userMap[u[0]] = { uid: u[0], displayName: u[7], photoURL: u[8] });

  const sent = [], received = [];
  for (let i = 1; i < reqs.length; i++) {
    const r = { id: reqs[i][0], fromUid: reqs[i][1], toUid: reqs[i][2], status: reqs[i][3], createdAt: reqs[i][4] };
    if (r.status !== 'pending') continue;
    if (r.fromUid === uid) sent.push(r);
    else if (r.toUid === uid) { r.fromUser = userMap[r.fromUid]; received.push(r); }
  }
  return { sent, received };
}

function respondToFriendRequest(requestId, status) {
  const sheet = getSheet('friendRequests');
  const reqs = sheet.getDataRange().getValues();
  for (let i = 1; i < reqs.length; i++) {
    if (reqs[i][0] === requestId) {
      sheet.getRange(i + 1, 4, 1, 3).setValues([[status, reqs[i][4], new Date().toISOString()]]);
      if (status === 'accepted') {
        const uids = [reqs[i][1], reqs[i][2]].sort();
        const chatId = uids.join('_');
        const chatSheet = getSheet('chats');
        const chats = chatSheet.getDataRange().getValues();
        if (!chats.some(c => c[0] === chatId)) {
          const now = new Date().toISOString();
          chatSheet.appendRow([chatId, JSON.stringify(uids), '', '', now, now]);
        }
      }
      return true;
    }
  }
  throw new Error('Request not found');
}

function getFriends(uid) {
  const reqSheet = getSheet('friendRequests');
  const reqs = reqSheet.getDataRange().getValues();
  const friendUids = reqs.slice(1).filter(r => r[3] === 'accepted' && (r[1] === uid || r[2] === uid))
    .map(r => r[1] === uid ? r[2] : r[1]);
  
  const userSheet = getSheet('users');
  const users = userSheet.getDataRange().getValues();
  return users.slice(1).filter(u => friendUids.includes(u[0])).map(u => ({ uid: u[0], displayName: u[7], photoURL: u[8], status: u[10] }));
}

function getChats(uid) {
  const chatSheet = getSheet('chats');
  const chats = chatSheet.getDataRange().getValues();
  const userSheet = getSheet('users');
  const users = userSheet.getDataRange().getValues();
  const userMap = {};
  userMap['SYSTEM'] = { uid: 'SYSTEM', displayName: 'System Warning', photoURL: 'https://cdn-icons-png.flaticon.com/512/179/179386.png', status: 'online' };
  users.forEach(u => userMap[u[0]] = { uid: u[0], displayName: u[7], photoURL: u[8], status: u[10] });

  return chats.slice(1).filter(c => {
    try { return JSON.parse(c[1]).includes(uid); } catch(e) { return false; }
  }).map(c => {
    const participants = JSON.parse(c[1]);
    const otherUid = participants.find(id => id !== uid) || uid;
    return {
      id: c[0], participants, 
      lastMessage: c[2] ? { text: c[2], senderUid: c[3], createdAt: c[4] } : null,
      updatedAt: c[5], otherUser: userMap[otherUid] || { uid: otherUid, displayName: 'User', status: 'offline' }
    };
  }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function sendMessage(chatId, senderUid, text, messageId) {
  const msgSheet = getSheet('messages');
  const now = new Date().toISOString();
  const id = messageId || Utilities.getUuid();
  msgSheet.appendRow([id, chatId, senderUid, text, now, false]);
  
  const chatSheet = getSheet('chats');
  const chats = chatSheet.getDataRange().getValues();
  for (let i = 1; i < chats.length; i++) {
    if (chats[i][0] === chatId) {
      chatSheet.getRange(i + 1, 3, 1, 4).setValues([[text, senderUid, now, now]]);
      return true;
    }
  }
  return true;
}

function getMessages(chatId, uid) {
  const msgSheet = getSheet('messages');
  const msgs = msgSheet.getDataRange().getValues();
  const chatMsgs = msgs.slice(1).filter(m => m[1] === chatId).map(m => ({
    id: m[0], chatId: m[1], senderUid: m[2], text: m[3], createdAt: m[4], read: m[5]
  }));
  
  // Mark as read
  for (let i = 1; i < msgs.length; i++) {
    if (msgs[i][1] === chatId && msgs[i][2] !== uid && !msgs[i][5]) {
      msgSheet.getRange(i + 1, 6).setValue(true);
    }
  }
  
  const chatSheet = getSheet('chats');
  const chats = chatSheet.getDataRange().getValues();
  const chat = chats.find(c => c[0] === chatId);
  let otherUser = null;
  if (chat) {
    const otherUid = JSON.parse(chat[1]).find(id => id !== uid);
    if (otherUid) otherUser = getProfile(otherUid);
  }
  
  return { messages: chatMsgs, otherUser };
}

function getUnreadMessages(uid) {
  const msgSheet = getSheet('messages');
  const msgs = msgSheet.getDataRange().getValues();
  const chatSheet = getSheet('chats');
  const chats = chatSheet.getDataRange().getValues();
  const userChatIds = chats.slice(1).filter(c => JSON.parse(c[1]).includes(uid)).map(c => c[0]);
  
  return msgs.slice(1).filter(m => userChatIds.includes(m[1]) && m[2] !== uid && !m[5]).map(m => ({
    id: m[0], chatId: m[1], senderUid: m[2], text: m[3], createdAt: m[4]
  }));
}

function markAllAsRead(chatId, uid) {
  const msgSheet = getSheet('messages');
  const msgs = msgSheet.getDataRange().getValues();
  for (let i = 1; i < msgs.length; i++) {
    if (msgs[i][1] === chatId && msgs[i][2] !== uid && !msgs[i][5]) {
      msgSheet.getRange(i + 1, 6).setValue(true);
    }
  }
  return true;
}

function blockUser(uid, blockedUid) {
  const sheet = getSheet('users');
  const users = sheet.getDataRange().getValues();
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === uid) {
      let blocked = [];
      try { if (users[i][16]) blocked = JSON.parse(users[i][16]); } catch(e) {}
      if (!blocked.includes(blockedUid)) {
        blocked.push(blockedUid);
        sheet.getRange(i + 1, 17).setValue(JSON.stringify(blocked));
      }
      return true;
    }
  }
  throw new Error('User not found');
}

function unblockUser(uid, blockedUid) {
  const sheet = getSheet('users');
  const users = sheet.getDataRange().getValues();
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === uid) {
      let blocked = [];
      try { if (users[i][16]) blocked = JSON.parse(users[i][16]); } catch(e) {}
      blocked = blocked.filter(id => id !== blockedUid);
      sheet.getRange(i + 1, 17).setValue(JSON.stringify(blocked));
      return true;
    }
  }
  throw new Error('User not found');
}

function changePassword(uid, oldPassword, newPassword) {
  const sheet = getSheet('users');
  const users = sheet.getDataRange().getValues();
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === uid) {
      if (users[i][2] !== oldPassword) throw new Error('Incorrect old password');
      sheet.getRange(i + 1, 3).setValue(newPassword);
      return true;
    }
  }
  throw new Error('User not found');
}

function changeUsername(uid, newUsername) {
  const sheet = getSheet('users');
  const users = sheet.getDataRange().getValues();
  if (users.slice(1).some(u => u[17] === newUsername && u[0] !== uid)) throw new Error('Username taken');
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === uid) {
      sheet.getRange(i + 1, 18).setValue(newUsername);
      return true;
    }
  }
  throw new Error('User not found');
}

function getOnlineUserCount() {
  const sheet = getSheet('users');
  const users = sheet.getDataRange().getValues();
  return users.slice(1).filter(u => u[10] === 'online').length;
}

function unfriend(uid, friendUid) {
  const sheet = getSheet('friendRequests');
  const reqs = sheet.getDataRange().getValues();
  for (let i = 1; i < reqs.length; i++) {
    if ((reqs[i][1] === uid && reqs[i][2] === friendUid) || (reqs[i][1] === friendUid && reqs[i][2] === uid)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function getAppStats() {
  const userSheet = getSheet('users');
  const msgSheet = getSheet('messages');
  
  // Get actual counts from sheets (subtracting header row)
  const usersCount = Math.max(0, userSheet.getLastRow() - 1);
  const messagesCount = Math.max(0, msgSheet.getLastRow() - 1);
  
  // Heuristic for countries: if no specific data, we'll use a conservative estimate based on users
  // or return 1 if only the admin exists. You can customize this if you add a 'country' column.
  const countriesCount = usersCount > 0 ? Math.min(195, Math.ceil(usersCount / 2)) : 0;
  
  return {
    usersCount: usersCount,
    messagesCount: messagesCount,
    countriesCount: countriesCount,
    uptime: "100%" // Assuming 100% since it's serverless
  };
}

function reportUser(reporterUid, reportedUid, reason) {
  const userSheet = getSheet('users');
  const users = userSheet.getDataRange().getValues();
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === reportedUid) {
      const count = (parseInt(users[i][15]) || 0) + 1;
      userSheet.getRange(i + 1, 16).setValue(count);
      
      const reportSheet = getSheet('reports');
      reportSheet.appendRow([Utilities.getUuid(), reporterUid, reportedUid, reason, new Date().toISOString()]);
      return true;
    }
  }
  return false;
}

function cleanChatHistory(chatId, uid) {
  const msgSheet = getSheet('messages');
  const msgs = msgSheet.getDataRange().getValues();
  for (let i = msgs.length - 1; i >= 1; i--) {
    if (msgs[i][1] === chatId) msgSheet.deleteRow(i + 1);
  }
  return true;
}

// --- ADMIN FUNCTIONS ---

function adminLogin(email, password) {
  const sheet = getSheet('admins');
  const admins = sheet.getDataRange().getValues();
  for (let i = 1; i < admins.length; i++) {
    if (admins[i][1] === email && admins[i][2] === password) {
      return { uid: admins[i][0], email: admins[i][1], role: admins[i][3] };
    }
  }
  throw new Error('Invalid admin credentials');
}

function adminGetUsers() {
  const sheet = getSheet('users');
  const users = sheet.getDataRange().getValues();
  return users.slice(1).map(u => ({
    uid: u[0], email: u[1], password: u[2], firstName: u[3], lastName: u[4], 
    displayName: u[7], photoURL: u[8], status: u[10], createdAt: u[12],
    isPermanentlyBanned: u[14] === true || u[14] === 'true',
    reportCount: parseInt(u[15]) || 0, username: u[17] || '', banExpires: u[18] || ''
  }));
}

function adminGetReports() {
  const sheet = getSheet('reports');
  const reports = sheet.getDataRange().getValues();
  const userSheet = getSheet('users');
  const users = userSheet.getDataRange().getValues();
  const userMap = {};
  users.forEach(u => userMap[u[0]] = u[7]);

  return reports.slice(1).map(r => ({
    id: r[0], reporterUid: r[1], reportedUid: r[2], reason: r[3], createdAt: r[4],
    reporterName: userMap[r[1]] || 'Unknown',
    reportedName: userMap[r[2]] || 'Unknown'
  }));
}

function adminDeleteReport(reportId) {
  const sheet = getSheet('reports');
  const reports = sheet.getDataRange().getValues();
  for (let i = 1; i < reports.length; i++) {
    if (reports[i][0] === reportId) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function adminBanUser(uid, days) {
  const sheet = getSheet('users');
  const users = sheet.getDataRange().getValues();
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === uid) {
      if (days === -1) {
        sheet.getRange(i + 1, 15).setValue(true); // isPermanentlyBanned
        sheet.getRange(i + 1, 19).setValue('');
      } else {
        const expires = new Date();
        expires.setDate(expires.getDate() + days);
        sheet.getRange(i + 1, 19).setValue(expires.toISOString());
        sheet.getRange(i + 1, 15).setValue(false);
      }
      return true;
    }
  }
  return false;
}

function adminUnbanUser(uid) {
  const sheet = getSheet('users');
  const users = sheet.getDataRange().getValues();
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === uid) {
      sheet.getRange(i + 1, 15).setValue(false);
      sheet.getRange(i + 1, 19).setValue('');
      return true;
    }
  }
  return false;
}

function adminAddAdmin(email, password, role) {
  const sheet = getSheet('admins');
  const admins = sheet.getDataRange().getValues();
  if (admins.slice(1).some(a => a[1] === email)) throw new Error('Admin email already exists');
  sheet.appendRow([Utilities.getUuid(), email, password, role, new Date().toISOString()]);
  return true;
}

function adminGetAdmins() {
  const sheet = getSheet('admins');
  const admins = sheet.getDataRange().getValues();
  return admins.slice(1).map(a => ({ uid: a[0], email: a[1], password: a[2], role: a[3], createdAt: a[4] }));
}

function adminSendWarning(uid, message) {
  // Warning is sent as a message from "SYSTEM"
  const chatSheet = getSheet('chats');
  const chats = chatSheet.getDataRange().getValues();
  const systemId = 'SYSTEM';
  
  // Find or create chat between SYSTEM and user
  const participants = [systemId, uid].sort();
  const chatId = participants.join('_');
  
  if (!chats.some(c => c[0] === chatId)) {
    const now = new Date().toISOString();
    chatSheet.appendRow([chatId, JSON.stringify(participants), '', '', now, now]);
  }
  
  return sendMessage(chatId, systemId, "⚠️ WARNING: " + message);
}
