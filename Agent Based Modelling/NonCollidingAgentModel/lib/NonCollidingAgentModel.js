var WINDOWBORDERSIZE = 10;
var HUGE = 999999; // Sometimes useful when testing for big or small numbers
var animationDelay = 200; // Controls simulation and transition speed
var isRunning = false; // Used in simStep and toggleSimStep
var surface; // Set in the redrawWindow function. It is the D3 selection of the svg drawing surface
var simTimer; // Set in the initialization function

// The drawing surface will be divided into logical cells
var maxCols = 40;
var cellWidth; // Calculated in the redrawWindow function
var cellHeight; // Calculated in the redrawWindow function

// Image URLs (remember to include proper credits if needed)
const urlPatientA = "images/People-Patient-Female-icon.png";
const urlPatientB = "images/People-Patient-Male-icon.png";
const urlDoctor1 = "images/Doctor_Female.png";
const urlDoctor2 = "images/Doctor_Male.png";
const urlReceptionist = "images/receptionist-icon.png";
const urlChair = "images/Chair-icon.png"; // NEW: Added URL for chair image

// Locations of caregivers
var doctorRow = 10;
var doctorCol = 20;
var receptionistRow = 1;
var receptionistCol = 20;

// Patient states
const UNTREATED = 0;
const WAITING = 1;
const STAGING = 2; 
const INTREATMENT = 3;
const TREATED = 4;
const DISCHARGED = 5;
const EXITED = 6;

// Waiting room occupancy status constants
const EMPTY = 0;
const OCCUPIED = 1;

// Caregiver states
const IDLE = 0;
const BUSY = 1;

// Caregiver types
const DOCTOR = 0;
const RECEPTIONIST = 1;
console.log(RECEPTIONIST);

// Dynamic agents (patients) and static agents (caregivers)
var patients = [];
var caregivers = [
    {"type": DOCTOR, "label": "Doctor", "location": {"row": doctorRow, "col": doctorCol}, "state": IDLE},
    {"type": RECEPTIONIST, "label": "Receptionist", "location": {"row": receptionistRow, "col": receptionistCol}, "state": IDLE}
];
var doctor = caregivers[0];

// Define areas. In our model the waiting area is now the non-colliding waiting room.
var areas = [
    {"label": "Waiting Area", "startRow": 4, "numRows": 3, "startCol": 19, "numCols": 3, "color": "pink"},
    {"label": "Staging Area", "startRow": doctorRow - 1, "numRows": 1, "startCol": doctorCol - 2, "numCols": 5, "color": "red"}
];
var waitingRoom = areas[0]; // waiting room is areas[0]

// Global array to hold waiting seats (non-colliding waiting room cells)
var waitingSeats = [];

// Simulation time and statistics
var currentTime = 0;
var statistics = [
    {"name": "Average time in clinic, Type A: ", "location": {"row": doctorRow + 3, "col": doctorCol - 4}, "cumulativeValue": 0, "count": 0},
    {"name": "Average time in clinic, Type B: ", "location": {"row": doctorRow + 4, "col": doctorCol - 4}, "cumulativeValue": 0, "count": 0}
];

// Probabilities for arrivals and departures
var probArrival = 0.25;
var probDeparture = 0.28;
var probTypeA = 0.5;

// Patient ID counters
var nextPatientID_A = 0;
var nextPatientID_B = 0;
var nextTreatedPatientID_A = 1;
var nextTreatedPatientID_B = 1;

// Helper function to find an available waiting seat (non-colliding seat)
function findAvailableSeat() {
    for (var i = 0; i < waitingSeats.length; i++) {
        if (waitingSeats[i].status === EMPTY) {
            return waitingSeats[i];
        }
    }
    return null;
}

// Initialization (called when the page loads)
(function() {
    window.addEventListener("resize", redrawWindow);
    simTimer = window.setInterval(simStep, animationDelay);
    redrawWindow();
})();

// Start/Pause simulation
function toggleSimStep(){ 
    isRunning = !isRunning;
    console.log("isRunning: " + isRunning);
}

// Rebuilds the simulation drawing surface and re-initializes simulation variables
function redrawWindow(){
    isRunning = false;
    window.clearInterval(simTimer);
    animationDelay = 550 - document.getElementById("slider1").value;
    simTimer = window.setInterval(simStep, animationDelay);
    
    // Reset simulation variables
    nextPatientID_A = 0;
    nextPatientID_B = 0;
    nextTreatedPatientID_A = 1;
    nextTreatedPatientID_B = 1;
    currentTime = 0;
    doctor.state = IDLE;
    statistics[0].cumulativeValue = 0;
    statistics[0].count = 0;
    statistics[1].cumulativeValue = 0;
    statistics[1].count = 0;
    patients = [];
    
    // Resize drawing surface
    var drawsurface = document.getElementById("surface");
    var creditselement = document.getElementById("credits");
    var w = window.innerWidth;
    var h = window.innerHeight;
    var surfaceWidth = (w - 3 * WINDOWBORDERSIZE);
    var surfaceHeight = (h - creditselement.offsetHeight - 3 * WINDOWBORDERSIZE);
    
    drawsurface.style.width = surfaceWidth + "px";
    drawsurface.style.height = surfaceHeight + "px";
    drawsurface.style.left = WINDOWBORDERSIZE/2 + 'px';
    drawsurface.style.top = WINDOWBORDERSIZE/2 + 'px';
    drawsurface.style.border = "thick solid #0000FF";
    drawsurface.innerHTML = '';
    
    // Compute cellWidth and cellHeight
    numCols = maxCols;
    cellWidth = surfaceWidth / numCols;
    numRows = Math.ceil(surfaceHeight / cellWidth);
    cellHeight = surfaceHeight / numRows;
    
    // Get the drawing surface via D3
    surface = d3.select('#surface');
    surface.selectAll('*').remove();
    surface.style("font-size", "100%");
    
    // Initialize waitingSeats for the waiting area based on waitingRoom dimensions
    waitingSeats = [];
    for (var r = waitingRoom.startRow; r < waitingRoom.startRow + waitingRoom.numRows; r++){
        for (var c = waitingRoom.startCol; c < waitingRoom.startCol + waitingRoom.numCols; c++){
            waitingSeats.push({ row: r, col: c, status: EMPTY });
        }
    }
    
    // Rebuild the drawing surface
    updateSurface();
}

// Translates a row and column into screen coordinates
function getLocationCell(location){
    var row = location.row;
    var col = location.col;
    var x = (col - 1) * cellWidth;
    var y = (row - 1) * cellHeight;
    return {"x": x, "y": y};
}

function updateSurface(){
    // Create/update patient agents
    var allpatients = surface.selectAll(".patient").data(patients);
    allpatients.exit().remove();
    var newpatients = allpatients.enter().append("g").attr("class", "patient");
    newpatients.append("svg:image")
      .attr("x", function(d){ var cell = getLocationCell(d.location); return cell.x + "px"; })
      .attr("y", function(d){ var cell = getLocationCell(d.location); return cell.y + "px"; })
      .attr("width", Math.min(cellWidth, cellHeight) + "px")
      .attr("height", Math.min(cellWidth, cellHeight) + "px")
      .attr("xlink:href", function(d){ return (d.type=="A") ? urlPatientA : urlPatientB; });
      
    var images = allpatients.selectAll("image");
    images.transition()
      .attr("x", function(d){ var cell = getLocationCell(d.location); return cell.x + "px"; })
      .attr("y", function(d){ var cell = getLocationCell(d.location); return cell.y + "px"; })
      .duration(animationDelay).ease('linear');
    
    // Create caregivers
    var allcaregivers = surface.selectAll(".caregiver").data(caregivers);
    var newcaregivers = allcaregivers.enter().append("g").attr("class", "caregiver");
    newcaregivers.append("svg:image")
      .attr("x", function(d){ var cell = getLocationCell(d.location); return cell.x + "px"; })
      .attr("y", function(d){ var cell = getLocationCell(d.location); return cell.y + "px"; })
      .attr("width", Math.min(cellWidth, cellHeight) + "px")
      .attr("height", Math.min(cellWidth, cellHeight) + "px")
      .attr("xlink:href", function(d){ return (d.type==DOCTOR) ? urlDoctor1 : urlReceptionist; });
    
    newcaregivers.append("text")
      .attr("x", function(d){ var cell = getLocationCell(d.location); return (cell.x + cellWidth) + "px"; })
      .attr("y", function(d){ var cell = getLocationCell(d.location); return (cell.y + cellHeight/2) + "px"; })
      .attr("dy", ".35em")
      .text(function(d){ return d.label; });
    
    // Display statistics
    var allstatistics = surface.selectAll(".statistics").data(statistics);
    var newstatistics = allstatistics.enter().append("g").attr("class", "statistics");
    newstatistics.append("text")
      .attr("x", function(d){ var cell = getLocationCell(d.location); return (cell.x + cellWidth) + "px"; })
      .attr("y", function(d){ var cell = getLocationCell(d.location); return (cell.y + cellHeight/2) + "px"; })
      .attr("dy", ".35em")
      .text("");
    
    allstatistics.selectAll("text").text(function(d) {
      var avgLengthOfStay = d.cumulativeValue/(Math.max(1,d.count));
      return d.name + avgLengthOfStay.toFixed(1);
    });
    
    // Draw areas (waiting area, staging area, etc.)
    var allareas = surface.selectAll(".areas").data(areas);
    var newareas = allareas.enter().append("g").attr("class", "areas");
    newareas.append("rect")
      .attr("x", function(d){ return (d.startCol-1)*cellWidth; })
      .attr("y",  function(d){ return (d.startRow-1)*cellHeight; })
      .attr("width",  function(d){ return d.numCols*cellWidth; })
      .attr("height",  function(d){ return d.numRows*cellWidth; })
      .style("fill", function(d){ return d.color; })
      .style("stroke", "black")
      .style("stroke-width", 1);
      
    // Draw waiting seats as SVG chairs using urlChair
    var seatSelection = surface.selectAll(".waitingSeat").data(waitingSeats);
    seatSelection.enter().append("svg:image")
      .attr("class", "waitingSeat")
      .attr("x", function(d){ return ((d.col-1)*cellWidth) + "px"; })
      .attr("y", function(d){ return ((d.row-1)*cellHeight) + "px"; })
      .attr("width", Math.min(cellWidth, cellHeight)+"px")
      .attr("height", Math.min(cellWidth, cellHeight)+"px")
      .attr("xlink:href", urlChair);
}

function addDynamicAgents(){
    // Add property "waitingSeat" to new patients for tracking seat assignment
    if (Math.random() < probArrival){
        var newpatient = {
            "id": 1,
            "type": "A",
            "location": {"row": 1, "col": 1},
            "target": {"row": receptionistRow, "col": receptionistCol},
            "state": UNTREATED,
            "timeAdmitted": 0,
            "waitingSeat": null  // initialize waitingSeat property
        };
        newpatient.type = (Math.random() < probTypeA) ? "A" : "B";
        patients.push(newpatient);
    }
}

function updatePatient(patientIndex){
    patientIndex = Number(patientIndex);
    var patient = patients[patientIndex];
    var row = patient.location.row;
    var col = patient.location.col;
    var type = patient.type;
    var state = patient.state;
    
    // Check if patient has reached its target
    var hasArrived = (Math.abs(patient.target.row - row) + Math.abs(patient.target.col - col)) == 0;
    
    switch(state){
        case UNTREATED:
            if (hasArrived){
                patient.timeAdmitted = currentTime;
                // Instead of choosing a random waiting spot, check for an available waiting seat
                var seat = findAvailableSeat();
                if (seat !== null){
                    patient.state = WAITING;
                    patient.target.row = seat.row;
                    patient.target.col = seat.col;
                    patient.waitingSeat = seat;  // assign the seat to this patient
                    seat.status = OCCUPIED;      // mark seat as occupied
                    if (patient.type == "A") patient.id = ++nextPatientID_A;
                    else patient.id = ++nextPatientID_B;
                } else {
                    // No free seat: immediately discharge the patient
                    patient.state = DISCHARGED;
                    patient.target.row = 1;
                    patient.target.col = maxCols;
                }
            }
            break;
        case WAITING:
            switch (type){
                case "A":
                    if (patient.id == nextTreatedPatientID_A){
                        // Free the waiting seat when the patient leaves the waiting area
                        if (patient.waitingSeat){
                            patient.waitingSeat.status = EMPTY;
                            patient.waitingSeat = null;
                        }
                        patient.target.row = doctorRow - 1;
                        patient.target.col = doctorCol - 1;
                        patient.state = STAGING;
                    }
                    if (patient.id == nextTreatedPatientID_A + 1){
                        patient.target.row = doctorRow - 1;
                        patient.target.col = doctorCol - 2;
                    }
                    break;
                case "B":
                    if (patient.id == nextTreatedPatientID_B){
                        // Free the waiting seat when the patient leaves the waiting area
                        if (patient.waitingSeat){
                            patient.waitingSeat.status = EMPTY;
                            patient.waitingSeat = null;
                        }
                        patient.target.row = doctorRow - 1;
                        patient.target.col = doctorCol + 1;
                        patient.state = STAGING;
                    }
                    if (patient.id == nextTreatedPatientID_B + 1){
                        patient.target.row = doctorRow - 1;
                        patient.target.col = doctorCol + 2;
                    }
                    break;
            }
            break;
        case STAGING:
            if (hasArrived){
                if (doctor.state == IDLE){
                    doctor.state = BUSY;
                    patient.state = INTREATMENT;
                    patient.target.row = doctorRow;
                    patient.target.col = doctorCol;
                    if (patient.type == "A") nextTreatedPatientID_A++;
                    else nextTreatedPatientID_B++;
                }
            }
            break;
        case INTREATMENT:
            if (Math.random() < probDeparture){
                patient.state = TREATED;
                doctor.state = IDLE;
                patient.target.row = receptionistRow;
                patient.target.col = receptionistCol;
            }
            break;
        case TREATED:
            if (hasArrived){
                patient.state = DISCHARGED;
                patient.target.row = 1;
                patient.target.col = maxCols;
                var timeInClinic = currentTime - patient.timeAdmitted;
                var stats = (patient.type == "A") ? statistics[0] : statistics[1];
                stats.cumulativeValue += timeInClinic;
                stats.count++;
            }
            break;
        case DISCHARGED:
            if (hasArrived){
                patient.state = EXITED;
            }
            break;
        default:
            break;
    }
    // Move the patient toward its target by one cell per step
    var targetRow = patient.target.row;
    var targetCol = patient.target.col;
    var rowsToGo = targetRow - row;
    var colsToGo = targetCol - col;
    var cellsPerStep = 1;
    var newRow = row + Math.min(Math.abs(rowsToGo), cellsPerStep) * Math.sign(rowsToGo);
    var newCol = col + Math.min(Math.abs(colsToGo), cellsPerStep) * Math.sign(colsToGo);
    patient.location.row = newRow;
    patient.location.col = newCol;
}

function removeDynamicAgents(){
    // Remove patients who have exited the clinic
    var allpatients = surface.selectAll(".patient").data(patients);
    var treatedpatients = allpatients.filter(function(d, i){ return d.state == EXITED; });
    treatedpatients.remove();
    patients = patients.filter(function(d){ return d.state != EXITED; });
}

function updateDynamicAgents(){
    for (var patientIndex in patients){
        updatePatient(patientIndex);
    }
    updateSurface();  
}

function simStep(){
    if (isRunning){
        currentTime++;
        addDynamicAgents();
        updateDynamicAgents();
        removeDynamicAgents();
    }
}