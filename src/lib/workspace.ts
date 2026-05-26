function handleFetchError(err: any, context: string): never {
  console.error(`Error in ${context}:`, err);
  const errMsg = String(err?.message || err);
  if (
    errMsg.includes('Failed to fetch') || 
    errMsg.includes('fetch') || 
    errMsg.includes('NetworkError') || 
    err instanceof TypeError || 
    err.name === 'TypeError'
  ) {
    throw new Error(
      `Google API Blocked (${context}): "Failed to fetch". This is a browser sandbox restriction because Google APIs are blocked inside the preview iframe.\n\n` +
      `💡 SOLUTION: Click the "Open in new tab" button at the top-right of your preview frame. This opens the app in a standalone tab, allowing Google Drive & Google Sheets to communicate securely with your credentials!`
    );
  }
  throw err;
}

export async function uploadToDrive(base64Image: string, fileName: string, accessToken: string) {
  try {
    const boundary = 'foo_bar_baz';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const metadata = {
      name: fileName,
      mimeType: 'image/jpeg'
    };

    const pureBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: image/jpeg\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        pureBase64 +
        close_delim;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
    });

    if (!res.ok) {
       const text = await res.text();
       throw new Error("Failed to upload to drive: " + text);
    }

    const data = await res.json();
    
    // make the file slightly more accessible by getting its webViewLink
    const linkRes = await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}?fields=webViewLink,id`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
    });
    
    let linkData: any = {};
    if (linkRes.ok) {
       linkData = await linkRes.json();
    }

    return { id: data.id, link: linkData.webViewLink || `https://drive.google.com/open?id=${data.id}` };
  } catch (err) {
    handleFetchError(err, "Uploading Scan Image to Google Drive");
  }
}

export async function createSpreadsheet(accessToken: string) {
  try {
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { title: "Vehicle Logs & Access List" },
        sheets: [{ properties: { title: "Log" } }]
      })
    });
    
    if (!res.ok) {
       throw new Error("Failed to create spreadsheet");
    }
    const data = await res.json();
    
    // add headers
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${data.spreadsheetId}/values/Log!A1:D1:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [["Timestamp", "Plate Number", "Type", "Image Link"]]
      })
    });
    
    return { id: data.spreadsheetId, url: data.spreadsheetUrl };
  } catch (err) {
    handleFetchError(err, "Creating Google Sheet");
  }
}

export async function fetchSheetRows(spreadsheetId: string, accessToken: string) {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Log!A:D`, {
       headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) {
        throw new Error("Failed to read spreadsheet bounds, double check if it has a 'Log' sheet tab.");
    }
    return await res.json();
  } catch (err) {
    handleFetchError(err, "Reading Log Tab from Google Sheet");
  }
}

export async function appendToSheet(spreadsheetId: string, accessToken: string, values: any[]) {
  try {
     const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Log!A:D:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [values] })
    });
    if (!res.ok) {
        throw new Error("Failed to append row to sheet.");
    }
    return await res.json();
  } catch (err) {
    handleFetchError(err, "Saving Log Entry to Google Sheet");
  }
}

export async function appendResidentToMasterSheet(accessToken: string, values: any[]) {
  try {
     const spreadsheetId = '1i65yRW4313T-xua0kBrH-ybpHws398_DWqEKEX4F2V0';
     
     const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title))`, {
       headers: { Authorization: `Bearer ${accessToken}` }
     });
     if (!metaRes.ok) throw new Error("Could not fetch master sheet metadata");
     const meta = await metaRes.json();
     const sheetName = meta.sheets[0].properties.title;

     const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:G:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [values] })
    });
    if (!res.ok) {
        throw new Error("Failed to append row to master sheet.");
    }
    return await res.json();
  } catch (err) {
    handleFetchError(err, "Registering to Master Google Sheet");
  }
}
