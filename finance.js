// Uses the SEC EDGAR api to validate filing URLs
window.custom = async function() {

  // returns promise resolving to error message if error, empty string if url valid
  // URL examples: fancy, then html
  // https://www.sec.gov/ix?doc=/Archives/edgar/data/47217/000004721724000024/hpq-20240131.htm
  // https://www.sec.gov/Archives/edgar/data/47217/000004721724000024/hpq-20240131.htm
  async function validateUrl(url) {
    // normalize to html url
    url = url.split('ix?doc=/').join(''); 

    // regex test, with match groups for CIK and filing ID
    const regex = /https:\/\/www.sec.gov\/Archives\/edgar\/data\/([^\/]+)\/([^\/]+)\/([^\/]+)$/;
    const m = regex.exec(url);
    if ((m) === null) {
      return "⚠️ Invalid SEC filing URL";
    }
    let cik = m[1].padStart(10, '0');
    let accessionNum = m[2];
    let docId = m[3];

    const request = new Request(`https://data.sec.gov/submissions/CIK${cik}.json`);
    const response = await fetch(request);

    // validates CIK
    if(!response.ok) {
      console.error(response);
      return "⚠️ Unable to validate URL";
    }

    const json = await response.json();

    // parse json response for filing date and doctype
    const index = json['filings']['recent']['primaryDocument'].indexOf(docId);
    const doctype = json['filings']['recent']['primaryDocDescription'][index];
    const date = json['filings']['recent']['filingDate'][index];
    const accessionNumApi = json['filings']['recent']['accessionNumber'][index];

    // validate filename (via valid index) and accession number (middle number)
    if(index < 0 || accessionNumApi.replaceAll("-","") !== accessionNum) {
      return `⚠️ Invalid SEC filing URL`;
    }

    // validate doc type
    if(doctype !== "10-Q" && doctype !== "10-K") {
      return `⚠️ Invalid filing type ${doctype}. Please only use 10-K or 10-Q filings.`;
    }

    // validate date
    const dateObj = new Date(date);
    const earliestDate = new Date("2023-10-01");
    if(dateObj < earliestDate) {
      return `⚠️ Document was filed on ${date}. Please do not use filings from before October 1, 2023.`;
    }

    //return `CIK: ${cik}, docId: ${docId}, doctype: ${doctype}, date: ${date}`;
    return "";
  }

  function listen() {
    document.addEventListener('change', (e) => {
      console.log(e)
      if(e.target.matches('textarea.input-base')) {
        const ancestor = e.target.closest('div[class=""]:has(div.surge-wysiwyg)');
        const questionText = ancestor?.querySelector(".surge-wysiwyg div p.verify-url");
        let warningText = questionText.querySelector(".warning");

        if(questionText) {

          if(!warningText) {
            warningText = document.createElement("span");
            questionText.appendChild(warningText);
            warningText.style.cssText = 'color: red; padding-left: 20px;';
            warningText.classList.add("warning");
          }

          const url = e.target.value.trim();
          if(url.length > 0) {
            validateUrl(url).then((err) => {
              if(err) {
                warningText.innerText = err;
              }
              else {
                warningText.innerText = "✅";
              }
            });
          }
          else {
            warningText.innerText = "";
          }
        }
      }
    });
  }

  listen();
};

// Only for testing locally in the console
//window.custom();
