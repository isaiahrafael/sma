var WINDOWBORDERSIZE = 10;
var HUGE = 999999; //Sometimes useful when testing for big or small numbers
var animationDelay = 300; //controls simulation and transition speed
var isRunning = false; // used in simStep and toggleSimStep
var surface; // Set in the redrawWindow function. It is the D3 selection of the svg drawing surface
var simTimer; // Set in the initialization function

//The drawing surface will be divided into logical cells
var maxCols = 40;
var cellWidth; //cellWidth is calculated in the redrawWindow function
var cellHeight; //cellHeight is calculated in the redrawWindow function

//You are free to change images to suit your purpose. These images came from flaticon.com. 
// The copyright rules for flaticon.com require a backlink on any page where they appear. 
// See the credits element on the html page for an example of how to comply with this rule.
const urlInfected = "images/Zombie.png";
const urlNotInfected = "images/Mask.png";

//a citizen may be COMUTTING; LEAVING (i.e. returning home); or Exited (i.e. left the system); 
const COMUTTING=0;
const LEAVING=1;
const EXITED = 2;

// ctizens is a dynamic list, initially empty
citizens = [];

// We can section our screen into different areas. In this model, the areas represent solely the city.
var srow=2
var nrow=maxCols/2.1-3
var scol=2
var ncol=maxCols/2.1-2

var areas =[
 {"label":"City","startRow":srow,"numRows":nrow,"startCol":scol,"numCols":ncol,"color":"#FFCC99"},	
]

// We need to add buildings to the city. These buildings should be equally spaced from 3 to 3 cells. You can modify the spacing
// Buildings is a empty list
var Buildings = [];

//Function used to compute the coordinates of each building
// Compute feasible row coordinates and column coordinates
function range(start, end, step = 1) {
	const len = Math.floor((end - start) / step) + 1
	return Array(len).fill().map((_, idx) => start + (idx * step))
  }
  var rowBuildings = range(srow, srow+nrow, 3);
  var colBuildings = range(scol+1, scol+ncol, 3);
 console.log(rowBuildings)
   
//Create all possible combinations of building coordinates
  for (i = 0; i < rowBuildings.length; i++) {
	for (j = 0; j < colBuildings.length; j++){
		var newbuilding ={"row":rowBuildings[i], "col":colBuildings[j]};
	    Buildings.push(newbuilding); 
	}
  }
console.log(Buildings)

var currentTime = 0;

// The probability of a citizen leaving home (probArrival); The probability of a citizen returning home (probDeparture).
var probArrival = 0.5;
var probDeparture = 0.2;

// We have different types of citizes (infected=I and notinfected=N) according to a probability, probInfected.
var probInfected = 0.1;

// These variables define what is the probability of getting infected when a notinfected citizen is near to a infected citizen, 
// It also specifies the minimum distance for an infection opportunity to take place
var InfectionRate=0.2;
var DistTransmission=4;

// This next function is executed when the script is loaded. It contains the page initialization code.
(function() {
	// Your page initialization code goes here
	// All elements of the DOM will be available here
	window.addEventListener("resize", redrawWindow); //Redraw whenever the window is resized
	simTimer = window.setInterval(simStep, animationDelay); // call the function simStep every animationDelay milliseconds
	// Initialize the slider bar to match the initial animationDelay;
	
	redrawWindow();
})();

// We need a function to start and pause the simulation.
function toggleSimStep(){ 
	//this function is called by a click event on the html page. 
	// Search BasicAgentModel.html to find where it is called.
	isRunning = !isRunning;
	console.log("isRunning: "+isRunning);
}

function redrawWindow(){
	isRunning = false; // used by simStep
	window.clearInterval(simTimer); // clear the Timer
    animationDelay = 550 - document.getElementById("slider1").value; 
	simTimer = window.setInterval(simStep, animationDelay); // call the function simStep every animationDelay milliseconds
	
	// Re-initialize simulation variables
	currentTime = 0;
    citizens = [];
		
	//resize the drawing surface; remove all its contents; 
	var drawsurface = document.getElementById("surface");
	var creditselement = document.getElementById("credits");
	var w = window.innerWidth;
	var h = window.innerHeight;
	var surfaceWidth =(w - 3*WINDOWBORDERSIZE);
	var surfaceHeight= (h-creditselement.offsetHeight - 3*WINDOWBORDERSIZE);
	
	drawsurface.style.width = surfaceWidth+"px";
	drawsurface.style.height = surfaceHeight+"px";
	drawsurface.style.left = WINDOWBORDERSIZE/2+'px';
	drawsurface.style.top = WINDOWBORDERSIZE/2+'px';
	drawsurface.style.border = "thick solid #0000FF"; //The border is mainly for debugging; okay to remove it
	drawsurface.innerHTML = ''; //This empties the contents of the drawing surface, like jQuery erase().
	
	// Compute the cellWidth and cellHeight, given the size of the drawing surface
	numCols = maxCols;
	cellWidth = surfaceWidth/numCols;
	numRows = Math.ceil(surfaceHeight/cellWidth);
	cellHeight = surfaceHeight/numRows;
	
	// In other functions we will access the drawing surface using the d3 library. 
	//Here we set the global variable, surface, equal to the d3 selection of the drawing surface
	surface = d3.select('#surface');
	surface.selectAll('*').remove(); // we added this because setting the inner html to blank may not remove all svg elements
	surface.style("font-size","100%");
	// rebuild contents of the drawing surface
	updateSurface();	
};

// The window is resizable, so we need to translate row and column coordinates into screen coordinates x and y
function getLocationCell(location){
	var row = location.row;
	var col = location.col;
	var x = (col-1)*cellWidth; //cellWidth is set in the redrawWindow function
	var y = (row-1)*cellHeight; //cellHeight is set in the redrawWindow function
	return {"x":x,"y":y};
}

function updateSurface(){
	// This function is used to create or update most of the svg elements on the drawing surface.
	// See the function removeDynamicAgents() for how we remove svg elements
	
	//Select all svg elements of class "citizen" and map it to the data list called patients
	var allcitizens = surface.selectAll(".citizen").data(citizens);
	
	// If the list of svg elements is longer than the data list, the excess elements are in the .exit() list
	// Excess elements need to be removed:
	allcitizens.exit().remove(); //remove all svg elements associated with entries that are no longer in the data list
	// (This remove function is needed when we resize the window and re-initialize the citizens array)
	 
	// If the list of svg elements is shorter than the data list, the new elements are in the .enter() list.
	// The first time this is called, all the elements of data will be in the .enter() list.
	// Create an svg group ("g") for each new entry in the data list; give it class "citizen"
	var newcitizens = allcitizens.enter().append("g").attr("class","citizen"); 
	//Append an image element to each new citizen svg group, position it according to the location data, and size it to fill a cell
	// Also note that we can choose a different image to represent the citizen based on the citizen type
	newcitizens.append("svg:image")
	 .attr("x",function(d){var cell= getLocationCell(d.location); return cell.x+"px";})
	 .attr("y",function(d){var cell= getLocationCell(d.location); return cell.y+"px";})
	 .attr("width", Math.min(cellWidth,cellHeight)+"px")
	 .attr("height", Math.min(cellWidth,cellHeight)+"px")
	 .attr("xlink:href",function(d){if (d.type=="I") return urlInfected; else return urlNotInfected;});
	
	// For the existing citizens, we want to update their location on the screen 
	// but we would like to do it with a smooth transition from their previous position.
	// D3 provides a very nice transition function allowing us to animate transformations of our svg elements.
	
	//First, we select the image elements in the allcitizens list
	var images = allcitizens.selectAll("image");
	// Next we define a transition for each of these image elements.
	// Note that we only need to update the attributes of the image element which change
	images.transition()
	 .attr("x",function(d){var cell= getLocationCell(d.location); return cell.x+"px";})
     .attr("y",function(d){var cell= getLocationCell(d.location); return cell.y+"px";})
     .attr("xlink:href",function(d){if (d.type=="I") return urlInfected; else return urlNotInfected;})
	 .duration(animationDelay).ease('linear'); // This specifies the speed and type of transition we want.
 
	
	// Finally, we would like to draw boxes around the different areas of our system. We can use d3 to do that too.

	//First a box representing the city
	var allareas = surface.selectAll(".areas").data(areas);
	var newareas = allareas.enter().append("g").attr("class","areas");
	// For each new area, append a rectangle to the group
	newareas.append("rect")
	.attr("x", function(d){return (d.startCol-1)*cellWidth;})
	.attr("y",  function(d){return (d.startRow-1)*cellHeight;})
	.attr("width",  function(d){return d.numCols*cellWidth;})
	.attr("height",  function(d){return d.numRows*cellWidth;})
	.style("fill", function(d) { return d.color; })
	.style("stroke","black")
	.style("stroke-width",1);
	
	//Second, boxes representing the buildings
	var allbuildings = surface.selectAll(".Buildings").data(Buildings);
	var newbuildings = allbuildings.enter().append("g").attr("class","Buildings");
	newbuildings.append("rect")
	.attr("x", function(d){return (d.col-1)*cellWidth;})
	.attr("y",  function(d){return (d.row-1)*cellHeight;})
	.attr("width",  function(d){return 1*cellWidth;})
	.attr("height",  function(d){return 1*cellWidth;})
	.style("fill", function(d) { return "#CC6600"; })
	.style("stroke","black")
	.style("stroke-width",1);
	
	
}
	

id=1;
function addDynamicAgents(){
	// Citizens are dynamic agents: they enter the city, commute and then leave
	// We have entering patients of two types "I" and "N"
	// We could specify their probabilities of arrival in any simulation step separately
	// Or we could specify a probability of arrival of all citizens and then specify the probability of a Type I arrival.
	// We have done the latter. probArrival is probability of arrival a citizen and probInfected is the probability of a type I citizen who arrives.
	// First see if a citizen arrives in this sim step. Then, the citizen is generated in one of the buildings of the city. Then the citizen type is selected
 
    if (Math.random()< probArrival){
		var homerow=Math.floor(Math.random() * ((nrow+srow) - srow) +srow)
        var homecol=Math.floor(Math.random() * ((ncol+scol) - scol) +scol)
        var targetrow=Math.floor(Math.random() * ((nrow+srow) - srow) +srow)
        var targetcol=Math.floor(Math.random() * ((ncol+scol) - scol) +scol)
        var newcitizen = {"id":id++,"type":"I","location":{"row":homerow,"col":homecol},
        "target":{"row":targetrow,"col":targetcol},"state":COMUTTING,"timeAdmitted":0};
        if (Math.random()<probInfected) {
         newcitizen.type = "I"}
        else{newcitizen.type = "N"};	
        //console.log(newcitizen)
    citizens.push(newcitizen);
	}
	
}

function updateCitizen(citizenIndex){
	//citizenIndex is an index into the citizens data array
	citizenIndex = Number(citizenIndex);
	var citizen = citizens[citizenIndex];
	// get the current location of the citizen
	var row = citizen.location.row;
    var col = citizen.location.col;
	var state = citizen.state;
	
	// determine if citizen has arrived at the target
	var hasArrived = (Math.abs(citizen.target.row-row)+Math.abs(citizen.target.col-col))==0;
	
   	// Behavior of citizen depends on his or her state
	switch(state){
		case COMUTTING:
			if (hasArrived){
				if (Math.random()<probDeparture){
					//Citizen is leaving // Ensure that the target is not a building
					citizen.state=LEAVING;
                    var targetrow=Math.floor(Math.random() * ((nrow+srow) - srow) +srow);
                    var targetcol=Math.floor(Math.random() * ((ncol+scol) - scol) +scol);
					citizen.target.row = targetrow;
					citizen.target.col = targetcol;
				} else {
                    // Citizen is still commuting// specifies a new target (cannot be a building)
                    var targetrow=Math.floor(Math.random() * ((nrow+srow) - srow) +srow);
                    var targetcol=Math.floor(Math.random() * ((ncol+scol) - scol) +scol);
					citizen.target.row = targetrow;
					citizen.target.col = targetcol;
				}
			}
		break;
		case LEAVING:
			if (hasArrived){
                citizen.state = EXITED;
			}
		break;
		default:
        break;
        
        
	}
     
   // set the current row and column of the citizen
   	// set the destination row and column
	var targetRow = citizen.target.row;
	var targetCol = citizen.target.col;
	// compute the distance to the target destination
	var rowsToGo = targetRow - row;
	var colsToGo = targetCol - col;
	// set the speed
	var cellsPerStep = 1;
	// compute the cell to move to
	var newRow = row + Math.min(Math.abs(rowsToGo),cellsPerStep)*Math.sign(rowsToGo);
	var newCol = col + Math.min(Math.abs(colsToGo),cellsPerStep)*Math.sign(colsToGo);
	// update the location of the citizen
	citizen.location.row = newRow;
	citizen.location.col = newCol;
	
}

function removeDynamicAgents(){
	// We need to remove citizens who have been discharged. 
	//Select all svg elements of class "citizen" and map it to the data list called patients
	var allcitizens = surface.selectAll(".citizen").data(citizens);
	//Select all the svg groups of class "citizens" whose state is EXITED
	var exitedcitizens = allcitizens.filter(function(d,i){return d.state==EXITED;});
	// Remove the svg groups of EXITED citizens: they will disappear from the screen at this point
	exitedcitizens.remove();
	
	// Remove the EXITED citizens from the citizens list using a filter command
	citizens = citizens.filter(function(d){return d.state!=EXITED;});
	// At this point the citizens list should match the images on the screen one for one 
	// and no citizens should have state EXITED
}

function updateDynamicAgents(){
	// loop over all the citizens and update their states
	for (var citizenIndex in citizens){
		updateCitizen(citizenIndex);
	}
	updateSurface();	
}

function simStep(){
	//This function is called by a timer; if running, it executes one simulation step 
	//The timing interval is set in the page initialization function near the top of this file
	if (isRunning){ //the isRunning variable is toggled by toggleSimStep
		// Increment current time (for computing statistics)
		currentTime++;
		// Sometimes new agents will be created in the following function
		addDynamicAgents();
		// In the next function we update each agent
		updateDynamicAgents();
		// Sometimes agents will be removed in the following function
        removeDynamicAgents();

	}
}
