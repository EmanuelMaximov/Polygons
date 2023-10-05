let canvas_width = 800;
let canvas_height = 475;

let canvases=[];

let polygons=[];
let polygons_line_width=[];
let polygons_tag_text=[];
let current_polygon_index=-1;
let coords = [];
let color_pen='black';
let edge_width=2;

//Global Flags
let added_polygon=false;
let pointCheck = false;
let clickCheck = false;
let pointChange;
let showCoordsCheck = false;
let showNodesCheck = true;
//Image Loading Support
let img = new Image();
let image_is_inserted=false;
//Zoom support
let zoom_activated = false;
let zoomMouseDown = false;
let translatePos = {x: 0, y: 0};
let zoom_startDragOffset ={x: 0, y: 0};
let scale = 1.0;
//Editing support
let edit_mode=false;
let clicked_nodes=[];
let select_nodes=false;
let drag_start=[0,0];
let drag_polygon=false;
let boundingRectangle={ top:[0,0],
                        bottom: [0,canvas_height],
                        most_right: [0,0],
                        most_left: [canvas_width,0]};


$(document).ready(function(){

  //Get Canvas instance
  let canvas = document.getElementById("graph");
  //Set canvas width and height
  canvas.width = canvas_width;
  canvas.height = canvas_height;
  let c=canvas.getContext('2d');


  // Tabs Handling
  const tabsContainer = document.querySelector(".tabs");
  const addTabButton = document.getElementById("add-tab");
  let tabsID=0;
  setActiveTab(0);
  // Function to create a new tab
  function createTab() {
    tabsID++;
    const newTabId = tabsID;
    const newTab = document.createElement("div");
    newTab.className = "tab";
    newTab.dataset.tab = newTabId;
    newTab.textContent = `New Layer`;
    newTab.innerHTML += '<span class="close-tab">×</span>';
    tabsContainer.insertBefore(newTab, addTabButton);
    setActiveTab(newTabId);
  }

  // Function to remove a tab
  function removeTab(tabId) {
    const tabToRemove = document.querySelector(`.tab[data-tab="${tabId}"]`);
    tabsContainer.removeChild(tabToRemove);
    document.body.removeChild(tabContentToRemove);
    setActiveTab(tabId-1);
  }

  // Function to set the active tab
  function setActiveTab(tabId) {
    if (tabId===undefined){
      return;
    }
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach(tab => {
      tab.classList.remove("active");
    });
    tabs[tabId].classList.add("active");

  }


  // Event listener for adding a new tab
  addTabButton.addEventListener("click", createTab);

  // Event delegation for closing tabs
  tabsContainer.addEventListener("click", function(event) {
    if (event.target.classList.contains("close-tab")) {
      const tabId = event.target.parentElement.dataset.tab;
      removeTab(parseInt(tabId));
    }
  });
  // Event delegation for setting an active tab when clicked
  tabsContainer.addEventListener("click", function(event) {
    if (event.target.classList.contains("tab")) {
      const tabId = event.target.dataset.tab;
      setActiveTab(tabId);
    }
  });
  // Context menu for renaming a tab name
  let contextMenu = null;

  function showContextMenu(event, tab) {
    // Check if there's an existing context menu, and if so, hide it
    hideContextMenu();
    // Check if the clicked tab is the "Add tab" button or "main tab"
    if (tab && tab.id === "add-tab" || tab && tab.id === "main-tab") {
      return;
    }
    contextMenu = document.createElement("div");
    contextMenu.className = "context-menu-container"; // Add a container class
    contextMenu.innerHTML = '<div class="context-menu">Rename tab name</div>';
    document.body.appendChild(contextMenu);

    contextMenu.style.left = event.pageX + "px";
    contextMenu.style.top = event.pageY + "px";

    const menu = contextMenu.querySelector(".context-menu");
    menu.addEventListener("click", function(e) {
      if (e.target.classList.contains("context-menu")) {
        renameTab(tab);
      }
      hideContextMenu();
    });

    document.addEventListener("click", function() {
      hideContextMenu();
    });
  }


  function hideContextMenu() {
    if (contextMenu) {
      document.body.removeChild(contextMenu);
      contextMenu = null;
    }
  }

  // Function to rename a tab
  function renameTab(tab) {
    const tabId = tab.dataset.tab;
    const newTabName = prompt("Enter a new tab name:", tab.textContent.trim().slice(0, -1));
    if (newTabName !== null) {
      tab.textContent = newTabName;
      // Preserve the 'x' option (close-tab)
      tab.innerHTML += '<span class="close-tab">×</span>';
    }
  }

  tabsContainer.addEventListener("contextmenu", function(event) {
    event.preventDefault();
    const tab = event.target.closest(".tab");
    if (tab) {
      showContextMenu(event, tab);
    }
  });

  // Get references to the info button and the info popup
  var infoButton = document.querySelector(".info-button");
  var infoPopup = document.getElementById("info-popup");

// Add event listeners for mouseover and mouseout
  infoButton.addEventListener("mouseover", showInfoPopup);
  infoButton.addEventListener("mouseout", hideInfoPopup);

  function showInfoPopup(event) {
    // Set the position of the popup
    infoPopup.style.left = 20 + "px";
    infoPopup.style.top = 20 + "px";
    // Show the popup
    infoPopup.classList.add("active");
  }
  function hideInfoPopup() {
    // Hide the popup
    infoPopup.classList.remove("active");
  }




  // ---------------------------------------- Events Listeners ----------------------------------------

  //Double-Click event for adding nodes to the polygon
  $("#graph").dblclick(function(e) {
    const x=e.offsetX;
    const y=output(e.offsetY);
    if (edit_mode && !pointCheck && added_polygon){
      coords.push([x,y,color_pen]);
      polygons[current_polygon_index]=coords;
      drawPolygons();
    }
  });

  // Mouse move event - for dragging polygon, dragging in zoom mode, and dragging node
  $("#graph").mousemove(function(e) {
    const x = undefined?e.layerX:e.offsetX;
    const y = output(undefined?e.layerY:e.offsetY);
    $("html, body").css("cursor","default");

    //Zoom Option - dragging whole canvas content
    if (zoom_activated) {
      if (zoomMouseDown) {
        c.clearRect(0, 0, canvas_width, canvas_height);
        translatePos.x = e.clientX - zoom_startDragOffset.x;
        translatePos.y = e.clientY - zoom_startDragOffset.y;
        c.save();
        c.translate(translatePos.x, translatePos.y);
        c.scale(scale, scale);
        drawPolygons();
        c.restore();
      }
    } else {
      if (edit_mode && !select_nodes) {
        if (checkInBoundingRect(x,y)) {
          $("html, body").css("cursor", "move");
          if (drag_polygon && !clickCheck) {
            // get the current mouse position
            let mx = e.clientX;
            let my = output(e.clientY);
            // calculate the distance the mouse has moved
            // since the last mousemove
            let dx = mx - drag_start[0];
            let dy = my - drag_start[1];

            for (let k = 0; k < coords.length; k++) {
              coords[k][0] += dx;
              coords[k][1] += dy;
            }
            drawPolygons();
            //update starting position
            drag_start[0] = mx;
            drag_start[1] = my;
          }
        }
        // node dragging option
        if (clickCheck) {
          $("html, body").css("cursor", "grabbing");
          coords[pointChange][0] = x;
          coords[pointChange][1] = y;
          drawPolygons();
        } else {
          pointCheck = false;
          for (let k = 0; k < coords.length; k++) {
            if (x - 5 <= coords[k][0] && x + 5 >= coords[k][0] && y - 5 <= coords[k][1] && y + 5 >= coords[k][1]) {
              $("html, body").css("cursor", "grab");
              pointCheck = true;
              pointChange = k;
              break;
            }
          }
        }
      }
      // When selecting nodes make the cursor as pointer
      if (select_nodes) {
        for (let k = 0; k < coords.length; k++) {
          if (x - 5 <= coords[k][0] && x + 5 >= coords[k][0] && y - 5 <= coords[k][1] && y + 5 >= coords[k][1]) {
            $("html, body").css("cursor", "pointer");
          }
        }
      }
    }
  });

  // Left Click event - select polygons' nodes on edit mode
  $("#graph").on('click', function(e){
    const x = e.offsetX;
    const y = output(e.offsetY);
   if (edit_mode && select_nodes){
     //Check what node was selected
     for (let k = 0; k < coords.length; k++) {
       if (x-5 <= coords[k][0] && x+5 >= coords[k][0] && y-5 <= coords[k][1] && y+5 >= coords[k][1]) {
         const ind=clicked_nodes.indexOf(k);
         if (ind === -1){  // add if node was not selected yet
           clicked_nodes.push(k);
         }
         else{ // remove if node was already selected
           clicked_nodes.splice(ind,1);
         }

         if (clicked_nodes.length==0){
           select_nodes=false;
           $("#remove_node").css("visibility","hidden");
         }
         else{
           $("#remove_node").css("visibility","visible");
         }
         drawRects();
         break;
       }
     }
   }
  });
  // Mouse Right-Button Click - for editing polygon
  $("#graph").on('contextmenu', function(e){
    e.preventDefault();
    polygons[current_polygon_index]=coords;
    const x = e.offsetX;
    const y = output(e.offsetY);
    let index=checkOnEdge([x,y]);

    if (index!=-1){// When right-clicked on polygon
      edit_mode=true;
      document.getElementById("v_mode").style.display = "none";
      document.getElementById("e_mode").style.display = "block";
      current_polygon_index=index;
      coords=polygons[index];
      polygons[current_polygon_index]=coords;
    }
    else{// When right-clicked on background
      edit_mode=false;
      select_nodes=false;
      clicked_nodes=[];
      document.getElementById("v_mode").style.display = "block";
      document.getElementById("e_mode").style.display = "none";
    }
    drawPolygons();
  });

  // Get co-ordinates of the start when dragging polygon or in zoom
  $("#graph").mousedown(function(e) {

    if (edit_mode){
      drag_polygon=true;
      //get current mouse position
      drag_start[0]=e.clientX;
      drag_start[1]=output(e.clientY);
    }
    //for zoom in
    if (zoom_activated){
      zoomMouseDown = true;
      zoom_startDragOffset.x=  e.clientX - translatePos.x;
      zoom_startDragOffset.y=  e.clientY - translatePos.y;
    }
    else{
      if (pointCheck) {
        clickCheck = true;
        $("html, body").css("cursor","grabbing");
      }
    }
  });

  $("#graph").mouseup(function(e) {
    drag_polygon=false;
    zoomMouseDown = false;
    if (clickCheck) {
      clickCheck = false;
      $("html, body").css("cursor","grab");
    }
  });

  $("#graph").mouseover(function() {
    drag_polygon=false;
    zoomMouseDown = false;
  });

  $("#graph").mouseout(function() {
    drag_polygon=false;
    zoomMouseDown = false;
  });


  // ---------------------------------------- Buttons ----------------------------------------

  // Load Image file button
  $("#inputFile").on("change", function(e) {
    let f = e.target.files[0];
    let fr = new FileReader();

    fr.onload = function(ev2) {
      console.dir(ev2);
      // calls the function to load image on load and previous polygons
      image_is_inserted=true;
      img.onload = drawPolygons;
      img.src = ev2.target.result;

    };
    fr.readAsDataURL(f);

  });

  // Show Co-ordinates check box
  $("#showCoords").change(function() {
    showCoordsCheck = this.checked;
    drawPolygons();
  });

  // Show Nodes check box
  $("#showNodes").change(function() {
    showNodesCheck = this.checked;
    drawPolygons();
  });

  // Clear Polygons only
  $("#clear_pol").click(function() {
    resetAll();
    drawPolygons();
  });

  // Clear screen including Polygons and Image
  $("#clear_screen").click(function() {
    resetAll();
    c.clearRect(0,0,canvas_width,canvas_height);
    img = new Image();
    image_is_inserted=false;
    //reset input file to "file not chosen"
    $('#inputFile').val('');
  });


  // add polygon
  $("#add_polygon").click(function() {
    if (!select_nodes && !zoom_activated){
      //update for first inserted polygon
      added_polygon=true;
      edit_mode=true;
      document.getElementById("v_mode").style.display = "none";
      document.getElementById("e_mode").style.display = "block";
      //push previous co-ordinates only if it's not empty or if it's the first polygon
      if (coords.length!=0 || polygons.length==0){
        coords=[];
        polygons.push(coords);
        polygons_line_width.push(edge_width);
        polygons_tag_text.push("");
        current_polygon_index=polygons.length-1;
      }
    }
  });

  // delete polygon
  $("#delete_polygon").click(function() {
    if (!select_nodes  && edit_mode){
      //remove polygon from polygons array
      polygons.splice(current_polygon_index, 1);
      polygons_tag_text.splice(current_polygon_index, 1);
      // after removing move back to the first polygon
      if (polygons.length > 0) {
        current_polygon_index = 0;
        coords = polygons[current_polygon_index];
      }
      else{
        resetAll();
      }
      drawPolygons();
    }

  });

  // Select nodes button for removal
  $("#select_nodes").click(function() {
    if (edit_mode){
      select_nodes=true;
    }
  });

  // Cancel Nodes selection button
  $("#cancel_select_nodes").on('click', function(e){
    if (edit_mode && select_nodes){
      $("#remove_node").css("visibility","hidden");
      select_nodes=false;
      clicked_nodes=[];
      drawPolygons();
    }
  });

  // removes all selected nodes
  $("#remove_node").on('click', function(e){
    let new_coords=[];
    // make new array with the not selected nodes to keep
    for (let i=0; i<coords.length;i++){
      if (clicked_nodes.indexOf(i) === -1){
        new_coords.push(coords[i]);
      }
    }
    coords=new_coords;
    clicked_nodes=[];
    select_nodes=false;
    $("#remove_node").css("visibility","hidden");

    // if all polygons' nodes were selected  - act like delete polygon button
    if (coords.length==0) {
      //remove polygon from polygons array
      polygons.splice(current_polygon_index, 1);
      polygons_tag_text.splice(current_polygon_index, 1);

      // after removing move back to the first polygon
      if (polygons.length > 0) {
        current_polygon_index = 0;
        coords = polygons[current_polygon_index];
      }
      else{
        resetAll();
      }
    }
    else{
      // update the current polygon to be without selected nodes
      polygons[current_polygon_index]=coords;
    }
    drawPolygons();

  });

  // Edge color
  $("#my-pen-color").on("change", function() {
    color_pen = $(this).val();
  });
  // Edge width
  $("#my-pen-width").on("change", function() {
    document.getElementById("my-pen-width").setAttribute("title", this.value);
    edge_width = $(this).val();
  });

  //Change color button - changes the color of selected polygon
  $("#Change_color").on("click", function() {
    if (edit_mode && !select_nodes) {
      let new_color=color_pen;
      // updates third item in every co-ordinate
      for (let i = 0; i < coords.length; i++) {
        coords[i][2]=new_color;
      }
      polygons[current_polygon_index]=coords;
      drawPolygons();
    }

  });

  //Change width button - changes the width of selected polygon
  $("#Change_width").on("click", function() {
    if (edit_mode && !select_nodes) {
      polygons_line_width[current_polygon_index] = edge_width;
      drawPolygons();
    }
  });

  //Zoom Slider
  $("#my-range").on("change", function() {
    document.getElementById("my-range").setAttribute("title", this.value);
    c.clearRect(0,0,canvas_width,canvas_height);
    scale=$(this).val();
    // checks if slider's value is changed
    if (scale!=1){
      zoom_activated=true;
      edit_mode=false;
      select_nodes=false;
      clicked_nodes=[];
      $("#remove_node").css("visibility","hidden");
      document.getElementById("v_mode").style.display = "block";
      document.getElementById("e_mode").style.display = "none";
      c.save();
      c.translate(translatePos.x, translatePos.y);
      c.scale(scale, scale);
      drawPolygons();
      c.restore();
    }
    // zoom slider went back to normal size
    else {
      zoom_activated=false;
      zoomMouseDown = false;
      drawPolygons();
    }
  });

  // Zoom reset button
  $("#reset_zoom").click(function() {
    document.getElementById('my-range').value = 0;
    zoom_activated=false;
    zoomMouseDown = false;
    drawPolygons();
  });

  // exports polygons array into JSON file
  $("#export_json").click(function() {
    let polygons_data=[];
    for (let i=0;i<polygons.length;i++){
      let coords_data={Width: 0,Coordinates: []};
      coords_data.Width=parseInt(polygons_line_width[i],10);
      coords_data.Coordinates=polygons[i];
      polygons_data.push(coords_data);
    }
    const originalData = JSON.parse(JSON.stringify(polygons_data));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(originalData, null, 2)], {
      type: "application/json"
    }));
    a.setAttribute("download", "Polygons data.json");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    alert("Polygons data was exported to JSON file successfully!")
  });

  // // Edit tag name button
  $("#edit_tag").click(function() {
    if (edit_mode){
      // Prompt the user for text input and store the result in a variable
      var userInput = prompt("Enter text:");

      // Check if the user entered text
      if (userInput !== null) {
        // You can now use the 'userInput' variable to store the entered text
        // console.log("User input: " + userInput);
        polygons_tag_text[current_polygon_index] = userInput;
        drawPolygons();
      }
    }


  });


  function getTabName(tabElement) {
    const tabText = tabElement.textContent.trim();
    if (tabText==="Open Layer"){
      return tabText;
    }
    return tabText.substring(0, tabText.length - 1); // Remove the last character (the close-button)

  }
  // // Move Polygon to other layer button
  $("#switch-layer").click(function() {
    // Get the button element
    var button = document.getElementById('switch-layer');

    // Create the tab list window
    var tabListWindow = document.createElement('div');
    tabListWindow.id = 'tabListWindow';

    // Get all the tab elements on your page
    var tabElements = document.querySelectorAll('.tab');

    // Create a list of tab names as options
    var options = [];
    tabElements.forEach(function(tabElement) {
      var tabId = tabElement.getAttribute('data-tab');
      var tabName = getTabName(tabElement); // Use the getTabName function to remove the close-button

      var option = document.createElement('div');
      option.textContent = tabName;
      option.classList.add('tabs-menu'); // Add the 'option' class

      // Add a click event listener to each option
      option.addEventListener('click', function() {
        // Save the tab ID when an option is clicked
        alert('You clicked on tab ID: ' + tabId);

        // Close the tab list window
        tabListWindow.style.display = 'none';
      });

      options.push(option);

    });

    // Append the options to the tab list window
    options.forEach(function(option) {
      tabListWindow.appendChild(option);
    });

    // Position the tab list window below the button
    var buttonRect = button.getBoundingClientRect();
    tabListWindow.style.top = buttonRect.bottom + 'px';
    tabListWindow.style.left = buttonRect.left + 'px';

    // Display the tab list window
    tabListWindow.style.display = 'block';

    // Add a mouseout event listener to the tab list window
    tabListWindow.addEventListener('mouseout', function(event) {
      var relatedTarget = event.relatedTarget;
      if (!relatedTarget || !tabListWindow.contains(relatedTarget)) {
        // Mouse is out of the tab list window, so hide it
        tabListWindow.style.display = 'none';
      }
    });

    // Add a mouseover event listener to apply the hover effect
    tabListWindow.addEventListener('mouseover', function(event) {
      var target = event.target;
      if (target.classList.contains('tabs-menu')) {
        // Apply the hover class when hovering over an option
        target.classList.add('hovered');
      }
    });

    // Add a mouseout event listener to remove the hover effect
    tabListWindow.addEventListener('mouseout', function(event) {
      var target = event.target;
      if (target.classList.contains('tabs-menu')) {
        // Remove the hover class when moving away from an option
        target.classList.remove('hovered');
      }
    });

    // Append the tab list window to the document
    document.body.appendChild(tabListWindow);

  });



  // ---------------------------------------- Auxiliary functions ----------------------------------------

  // reset all flags and Data
  function resetAll(){
    document.getElementById('my-range').value = 0;
    document.getElementById("v_mode").style.display = "block";
    document.getElementById("e_mode").style.display = "none";
    $("#remove_node").css("visibility","hidden");
    polygons=[];
    polygons_line_width=[];
    polygons_tag_text=[];
    current_polygon_index=-1;
    coords = [];

    added_polygon=false;
    pointCheck = false;
    clickCheck = false;
    showCoordsCheck = false;
    showNodesCheck=true;

    zoom_activated = false;
    zoomMouseDown = false;
    translatePos = {x: 0, y: 0};
    zoom_startDragOffset ={x: 0, y: 0};
    scale = 1.0;

    edit_mode=false;
    clicked_nodes=[];
    select_nodes=false;
    drag_start=[0,0];
    drag_polygon=false;
  }
  // callback function to load image into canvas in the right proportion
  function load_image(){

    let hRatio = canvas_width / img.width    ;
    let vRatio =  canvas_height / img.height  ;
    let ratio  = Math.min ( hRatio, vRatio );
    let centerShift_x = ( canvas_width - img.width*ratio ) / 2;
    let centerShift_y = ( canvas_height - img.height*ratio ) / 2;
    c.clearRect(0,0,canvas_width,canvas_height);
    c.drawImage(img, 0,0, img.width, img.height,
      centerShift_x,centerShift_y,img.width*ratio, img.height*ratio);
  }
  // makes origin in bottom left
  function output(d) {
    return canvas_height-d;
  }


  // draws the dashed bounding rect around the polygon in edit-mode
  function drawBoundingRect() {
    boundingRectangle.top=[0,0];
    boundingRectangle.bottom=[0,canvas_height];
    boundingRectangle.most_right=[0,0];
    boundingRectangle.most_left=[canvas_width,0];

    //gets the most left,right,top and bottom coordinates of the polygon
    for (let i = 0; i < coords.length; i++) {
      if (coords[i][1]> boundingRectangle.top[1]){
        boundingRectangle.top=coords[i];
      }
      if (coords[i][1]<boundingRectangle.bottom[1]){
        boundingRectangle.bottom=coords[i];
      }
      if (coords[i][0]>boundingRectangle.most_right[0]){
        boundingRectangle.most_right=coords[i];
      }
      if (coords[i][0]<boundingRectangle.most_left[0]){
        boundingRectangle.most_left=coords[i];
      }
    }
    c.save();
    c.strokeStyle='black';
    c.lineWidth=2;
    c.setLineDash([10, 5]);
    c.strokeRect(boundingRectangle.most_left[0], output(boundingRectangle.bottom[1]), boundingRectangle.most_right[0]-boundingRectangle.most_left[0], output(boundingRectangle.top[1])-output(boundingRectangle.bottom[1]));
    c.restore();
  }

  // Check if cursor in Bounding Rect area
  function checkInBoundingRect(x,y) {
    if (coords.length!=0 && y>=boundingRectangle.bottom[1] && y<=boundingRectangle.top[1] &&
      x>=boundingRectangle.most_left[0] && x<=boundingRectangle.most_right[0]){
      return true
    }
    return false

  }

  // Draw Rects around selected nodes for removal
  function drawRects() {
    drawPolygons();
    c.save();
    c.fillStyle='red';
    for (let k = 0; k < clicked_nodes.length; k++) {
      c.fillRect(coords[clicked_nodes[k]][0]-6,output(coords[clicked_nodes[k]][1])-6,12,12);
      c.stroke();
    }
    c.restore();
  }

  // Returns the index of the polygon that the mouse hovers on
  function checkOnEdge(clicked_coord){
    for (let i = 0; i < polygons.length; i++) {
      for (let j = 0; j < polygons[i].length-1; j++) {
        if (checkOnLine(polygons[i][j],polygons[i][j+1],clicked_coord)) {
            return i
        }
      }
      // check first and last coords of the polygon (private case of the above)
      if (checkOnLine(polygons[i][0],polygons[i][polygons[i].length-1],clicked_coord)) {
        return i
      }
    }
    return -1
  }

  // Checks for given edge of the polygon if the mouse hovers on
  function checkOnLine(a,b,clicked_coord) {
    let threshold = 25;
    let ax=a[0];
    let ay=a[1];
    let bx=b[0];
    let by=b[1];
    // Calculate the distance between the mouse click position and the line
    const A = bx-ax;
    const B = ay-clicked_coord[1];
    const C = ax - clicked_coord[0];
    const D = by - ay;
    const dist = Math.abs(A * B - C * D) / Math.sqrt(A * A + D * D);

    // ensures the mouse is at threshold distance from polygon's edge
    if (dist <= threshold &&
      (clicked_coord[0]>=Math.min(ax,bx)-threshold && clicked_coord[0]<=Math.max(ax,bx)+threshold) &&
      (clicked_coord[1]>=Math.min(ay,by)-threshold && clicked_coord[1]<=Math.max(ay,by)+threshold)){
      return true
    }
    return false
  }

  // Display a circle for given co-ordinate and display its values
  function displayCoord(a,width) {
    c.save();
    if (showNodesCheck){
      c.fillStyle = a[2];
      c.beginPath();
      c.arc(parseInt(a[0],10),output(parseInt(a[1],10)), (width/2)+3, 0, 2 * Math.PI);
      c.fill();
    }
    if (showCoordsCheck) c.fillText("("+a[0]+","+a[1]+")",parseInt(a[0],10)+10,output(parseInt(a[1],10)+10));
    c.restore();
  }

  // Draw a line between co-ordinates
  function drawLine(b,d) {
    c.beginPath();
    c.moveTo(parseInt(b[0],10),output(parseInt(b[1],10)));
    c.lineTo(parseInt(d[0],10),output(parseInt(d[1],10)));
    c.stroke();
  }

  function getTopCoordinate(current_polygon){
    let top=[0,0];
    for (let i = 0; i < current_polygon.length; i++) {
      if (current_polygon[i][1]> top[1]){
        top=current_polygon[i];
      }
    }
    return top;
  }
  function drawTag(topCoord,tag){

    if (tag!=""){
      c.save();
      // Set the text size (adjust this as needed)
      var textSize = 15;

      // Set the text properties
      c.font = textSize + "px Calibri";
      c.fillStyle = "white";
      c.textAlign = "center";
      c.textBaseline = "middle";

      var text = "#"+tag;
      var text = "#"+tag;
      var x = topCoord[0];
      var y = output(topCoord[1])-13;

      // Measure the text's width
      var textWidth = c.measureText(text).width;
      if (textWidth>0){
        var padding=4;
        // Calculate the bounding rectangle coordinates and dimensions
        var rectX = x - textWidth / 2; // X-coordinate of the top-left corner of the rectangle
        var rectY = y - textSize / 2 - 5; // Y-coordinate of the top-left corner of the rectangle
        var rectWidth = textWidth; // Width of the rectangle
        var rectHeight = textSize + padding; // Height of the rectangle (including rounded edges)
        var cornerRadius = 4.5; // Radius for the upper edges

        // Draw the filled bounding rectangle with only the upper edges rounded
        c.fillStyle = "black"; // Fill color
        c.strokeStyle = "black"; // Border color
        c.lineWidth = 2; // Border width
        c.beginPath();
        c.moveTo(rectX + cornerRadius, rectY);
        c.lineTo(rectX + rectWidth - cornerRadius, rectY);
        c.arcTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + cornerRadius, cornerRadius);
        c.lineTo(rectX + rectWidth, rectY + rectHeight);
        c.lineTo(rectX, rectY + rectHeight);
        c.lineTo(rectX, rectY + cornerRadius);
        c.arcTo(rectX, rectY, rectX + cornerRadius, rectY, cornerRadius);
        c.closePath();
        c.fill();
        c.stroke();

// Draw the text in front of the bounding rectangle
        c.fillStyle = "white"; // Text color
        c.fillText(text, x, y);
      }
      c.restore();
    }

  }

  function drawPolygons() {
    c.clearRect(0,0,canvas_width,canvas_height);
    // load the image if inserted
    if (image_is_inserted){
      load_image();
    }
    for (let j = 0; j < polygons.length; j++) {
      c.lineWidth=polygons_line_width[j];
      //Draws Tag name
      drawTag(getTopCoordinate(polygons[j]),polygons_tag_text[j]);
      for (let i = 0; i < polygons[j].length; i++) {
        displayCoord(polygons[j][i],polygons_line_width[j]);
        if (i == polygons[j].length-1) {
          c.strokeStyle=polygons[j][i][2];
          drawLine(polygons[j][i],polygons[j][0]);
        } else {
          c.strokeStyle=polygons[j][i+1][2];
          drawLine(polygons[j][i],polygons[j][i+1]);
        }
      }
    }
    if (edit_mode){
      drawBoundingRect();
    }
  }
});
