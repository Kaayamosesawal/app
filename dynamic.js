pdf.getPage(currentPage).then((page) => {
    var scale = 1.5;
    var viewport =page.getViewport({ scale: scale});
    
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    var renderContext = {
        canvasContext: context,
        viewport: viewport,
    };

    page
    .render(renderContext)
    .promise.then(() => {
        resolve(canvas.toDataURL());
    })
    .catch((error) => {
        reject(error);
    })

})




function printJS() {
    var content = document.getElementById("resume");
  
    const allButtons = document.querySelectorAll("#print button");
    allButtons.forEach(button => {
        button.classList.add("none");
    });
    let allInputCheckboxes = document.querySelectorAll(".input-checkbox");
    allInputCheckboxes.forEach(input => {
        input.classList.add("none");
    })
  
  allButtons.forEach(button => {
      button.classList.remove("none");
  })
  allInputCheckboxes.forEach(input => {
      input.classList.remove("none");
  })
  
  const pdfOptions = {
      margin: 9,
      filename: 'converted_document.pdf',
      image: { type: 'png', quality: 1.0 },
      html2canvas: { scale: 1 },
      jsPDF: { unit: 'inch', format: 'a4', orientation: 'portrait', pages:1 }
      
  };
  
    html2pdf(content, {
        html2canvas: { scale: 1, logging: true, dpi: 500 }
    }, pdfOptions);

  }
  
  function addedu() {
    const head = document.createElement('div');
    document.getElementById("education").appendChild(head);
    head.innerHTML = ('<div class="edublock"><span><input type="checkbox" class="input-checkbox"></span><span class="education-head" contenteditable="true">ACADEMIC QUALIFICATION</span><div ><span contenteditable="true">Institute name - <span contenteditable="true">Level</span> - <span contenteditable="true">Passing Year</span></div></div>');
    saveresume();
  }
  function remedu(event) {
    let val = 0;
    let empty = true;
    const allInputCheckboxes = event.target.parentElement.getElementsByClassName("input-checkbox");
    const array = Array.from(allInputCheckboxes);
    if (array.length === 0) {
        alert("No fields are present to be deleted!")
    }
    else {
        console.log(array);
        array.forEach(element => {
            if (element.checked === true) {
                val = 1;
                element.parentElement.parentElement.remove();
            }
        })
        if (val === 0) alert("Please select the checkboxes to delete the required field!")
    }
    saveresume();
  }
  
  
  function addskill() {
    const head = document.createElement('div');
    document.getElementById("skills").appendChild(head);
    head.innerHTML = ('<div class="skill"><span><input type="checkbox" class="input-checkbox"></span><span contenteditable="true">write your skill here</span></div>');
    saveresume();
  }
  
  function remskill(event) {
    let val = 0;
    const allInputCheckboxes = event.target.parentElement.getElementsByClassName("input-checkbox");
    const array = Array.from(allInputCheckboxes);
    if (array.length === 0) {
        alert("No fields are present to be deleted!")
    }
    else {
        console.log(array);
        array.forEach(element => {
            if (element.checked === true) {
                val = 1;
                element.parentElement.parentElement.remove();
            }
        })
        if (val === 0) alert("Please select the checkboxes to delete the required field!")
    }
    saveresume();
  }
  
  
  function addLang() {
    const head = document.createElement('div');
    document.getElementById("languages").appendChild(head);
    head.innerHTML = ('<div class="language"><span><input type="checkbox" class="input-checkbox"></span><span contenteditable="true">Language spoken</span>&nbsp-&nbsp<span contenteditable="true">Fluently</span></div>');
    saveresume();
  }
  function remLang(event) {
    let val = 0;
    const allInputCheckboxes = event.target.parentElement.getElementsByClassName("input-checkbox");
    const array = Array.from(allInputCheckboxes);
    if (array.length === 0) {
        alert("No fields are present to be deleted!")
    }
    else {
        console.log(array);
        array.forEach(element => {
            if (element.checked === true) {
                val = 1;
                element.parentElement.parentElement.remove();
            }
        })
        if (val === 0) alert("Please select the checkboxes to delete the required field!")
    }
    saveresume();
  }
  
  
  function addAch() {
    const head = document.createElement('div');
    document.getElementById("achievement").appendChild(head);
    head.innerHTML = ('<div class="achieve" ><span><input type="checkbox" class="input-checkbox"></span><span contenteditable="true">Write your achievement</span></div>');
    saveresume();
  }
  function remAch(event) {
    let val = 0;
    const allInputCheckboxes = event.target.parentElement.getElementsByClassName("input-checkbox");
    const array = Array.from(allInputCheckboxes);
    if (array.length === 0) {
        alert("No fields are present to be deleted!")
    }
    else {
        console.log(array);
        array.forEach(element => {
            if (element.checked === true) {
                val = 1;
                element.parentElement.parentElement.remove();
            }
        })
        if (val === 0) alert("Please select the checkboxes to delete the required field!")
    }
    saveresume();
  }
  
  
  function addInt() {
    const head = document.createElement('div');
    document.getElementById("interest").appendChild(head);
    head.innerHTML = ('<div class="achieve" ><span><input type="checkbox" class="input-checkbox"></span><span contenteditable="true">Write interest</span></div>');
    saveresume();
  }
  function remInt(event) {
    let val = 0;
    const allInputCheckboxes = event.target.parentElement.getElementsByClassName("input-checkbox");
    const array = Array.from(allInputCheckboxes);
    if (array.length === 0) {
        alert("No fields are present to be deleted!")
    }
    else {
        array.forEach(element => {
            if (element.checked === true) {
                val = 1;
                element.parentElement.parentElement.remove();
            }
        })
        if (val === 0) alert("Please select the checkboxes to delete the required field!")
    }
    saveresume();
  }
  
  
  
  function saveresume() {
    var sec = document.getElementById("print");
    value1 = sec.innerHTML;
    var info = document.getElementById("custinfo");
    info.value = value1;
  }
    

  document.addEventListener("DOMContentLoaded", () => {
    let printLink = document.getElementById("print");
    let containter = document.getElementById("resume");

    printLink.addEventListener("click", Event => {
        Event.preventDefault();
        printLink.style.display = "none";
        window.print();
    }, false);
    containter.addEventListener("click", Event => {
        printLink.style.display = "grid";
    }, false);
  }, false);