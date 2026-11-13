/**
 * ສະແກນເອກະສານ · ສຳມະໂນຄົວ & ບັດປະຈຳຕົວ  (Google Apps Script)
 *
 * ອັບເດດອັດຕະໂນມັດ: doGet() ດຶງ index.html ລ່າສຸດຈາກ GitHub ທຸກຄັ້ງ (cache 2 ນາທີ)
 * → push ໂຄດຂຶ້ນ GitHub ເທື່ອດຽວ, ລິ້ງ /exec ນີ້ກໍ່ອັບເດດເອງ ບໍ່ຕ້ອງ Deploy ໃໝ່.
 * ຖ້າດຶງຈາກ GitHub ບໍ່ໄດ້ ຈະໃຊ້ໄຟລ໌ Index.html ທີ່ຢູ່ໃນໂປຣເຈັກນີ້ແທນ (ສຳຮອງ).
 *
 * ຮູບທັງໝົດຖືກປະມວນຜົນໃນ browser ຂອງຜູ້ໃຊ້ — ຍົກເວັ້ນເມື່ອກົດ "ບັນທຶກລົງ Google Drive".
 */

const APP_TITLE = 'ສະແກນເອກະສານ · ສຳມະໂນຄົວ & ບັດປະຈຳຕົວ';
const DRIVE_FOLDER_NAME = 'ເອກະສານສະແກນ (ສຳມະໂນຄົວ-ບັດປະຈຳຕົວ)';
const SOURCE_URL = 'https://raw.githubusercontent.com/maketingldbhox-arch/mk-doc-scanner/main/index.html';
const CACHE_SECONDS = 120;

function doGet(e) {
  var html = (e && e.parameter && e.parameter.local === '1') ? null : fetchLatest_();
  var out = html ? HtmlService.createHtmlOutput(html) : HtmlService.createHtmlOutputFromFile('Index');
  return out
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** ດຶງ index.html ຈາກ GitHub (ເກັບ cache ເປັນທ່ອນໆ ເພາະ CacheService ຈຳກັດ 100KB/ລາຍການ) */
function fetchLatest_() {
  var cache = CacheService.getScriptCache();
  try {
    var n = Number(cache.get('src_n') || 0);
    if (n > 0) {
      var keys = []; for (var i = 0; i < n; i++) keys.push('src_' + i);
      var got = cache.getAll(keys), parts = [];
      for (var j = 0; j < n; j++) { if (got['src_' + j] == null) { parts = null; break; } parts.push(got['src_' + j]); }
      if (parts) return parts.join('');
    }
  } catch (err) {}
  try {
    var res = UrlFetchApp.fetch(SOURCE_URL + '?t=' + Date.now(), { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) return null;
    var text = res.getContentText('UTF-8');
    if (text.indexOf('<html') < 0) return null;
    var size = 90000, obj = {}, k = 0;
    for (var p = 0; p < text.length; p += size) obj['src_' + (k++)] = text.substring(p, p + size);
    obj.src_n = String(k);
    try { cache.putAll(obj, CACHE_SECONDS); } catch (err2) {}
    return text;
  } catch (err3) {
    return null;
  }
}

/**
 * ບັນທຶກໄຟລ໌ (PDF ຫຼື JPG) ລົງ Google Drive.
 * @param {{data:string, mime:string, name:string}} payload  data = base64 (ບໍ່ມີ prefix data:)
 */
function saveToDrive(payload) {
  if (!payload || !payload.data) throw new Error('ບໍ່ມີຂໍ້ມູນໄຟລ໌');
  var allowed = ['application/pdf', 'image/jpeg'];
  if (allowed.indexOf(payload.mime) < 0) throw new Error('ປະເພດໄຟລ໌ບໍ່ຖືກຕ້ອງ');
  var name = String(payload.name || 'document').replace(/[\\/:*?"<>|]/g, '_');
  var folder = getFolder_();
  var blob = Utilities.newBlob(Utilities.base64Decode(payload.data), payload.mime, name);
  var file = folder.createFile(blob);
  return { url: file.getUrl(), name: file.getName(), folderUrl: folder.getUrl() };
}

function getFolder_() {
  var it = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

/** ລ້າງ cache ດ້ວຍມື (ຖ້າຢາກເຫັນເວີຊັນໃໝ່ທັນທີ) */
function clearCache() {
  CacheService.getScriptCache().remove('src_n');
}
