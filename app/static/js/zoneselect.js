var zoneGrid = {
    'width'             : 16,
    'height'            : 9,
    'defaultColor'      : 'grey',
    'colors'            : [],
    'zones'             : [],
    'zonesTemp'         : [],
    'lightsMaster'      : [],
    'activeLights'      : [],
    'availableLights'   : [],
    'state'             : false,
    'selectionStarted'  : false,
    'startCell'         : '',
    'endCell'           : '',
    'toggleZonesUrl'    : '',
    'updateZonesUrl'    : ''
};

zoneGrid.init = function() {
    generateColors();
    updateGridLights();
    buildGrid();

    $('#toggle-zone-mode').on('click', function() {
        toggleZoneMode();
    });

    $('#revert').on('click', function() {
        notification('Reverting Zone changes');
        // Revert zonesTemp object to zones original (without reference)
        zoneGrid.zonesTemp = JSON.parse(JSON.stringify(zoneGrid.zones));
        updateGridLights();
        buildGrid();
    });

    $('#save-zones').on('click', function() {
        saveGridResults();
    });
};

// Rebuilds zoneGrid object light lists
function updateGridLights() {
    var activeLights = [],
        zones = zoneGrid.zonesTemp,
        bulbsInUse = [];

    $('.bulb-container').each(function() {
       if (!$(this).hasClass('bulb-inactive')) {
           var lightId = $(this).data('light');
           activeLights[lightId] = zoneGrid.lightsMaster[lightId];
       }
    });
    zoneGrid.activeLights = activeLights;

    // Get list of bulbs already assigned to a zone
    for (var i=0; i<zones.length; i++) {
        var bulbs = zones[i].bulbs;
        for (var j=0; j<bulbs.length; j++) {
            bulbsInUse.push(bulbs[j].toString());
        }
    }

    // Build new list of active lights not currently used in a zone
    zoneGrid.availableLights = [];
    for (var k in zoneGrid.activeLights) {
        if ($.inArray(k, bulbsInUse) > -1) {
        } else {
            zoneGrid.availableLights.push(k);
        }
    }
}

function generateColors() {
    for (var i=0; i<64; i++) {
        var color = randomColor({
            luminosity: 'dark'
        });
        if (!$.inArray(color, zoneGrid.colors) > -1) {
            zoneGrid.colors.push(color);
        }
    }
}

//== Main HTML Grid/Form Functions ================================================================
// Builds the HTML grid, places click event
function buildGrid() {
    var grid = $('#grid');
    grid.html(''); // clear grid
    updateZoneContainers(); // rebuild bulb selection forms
    addBulbsToZone();  // event handlers for the bulb selection forms

    for (var lineIndex=0; lineIndex<zoneGrid.height; lineIndex++) {
        // Build each line
        var lineId = "line-" + lineIndex;
        grid.append("<div class='line' id='" + lineId + "' ></div>");
        for (var cellIndex=0; cellIndex<zoneGrid.width; cellIndex++) {
            // Build each cell
            var line = $('#' + lineId),
                cellId = "cell-" + lineIndex + "-" + cellIndex;
            line.append("<div class='cell' id='" + cellId + "' >&nbsp;</div>");

            var cell = $('#' + cellId);
            cell.css('background-color', zoneGrid.defaultColor);

            // Restore color if cell is from saved zone
            for (var i in zoneGrid.zonesTemp) {
                var zone = zoneGrid.zonesTemp[i];
                if (lineIndex >= zone.y1 && lineIndex <= zone.y2 && cellIndex >= zone.x1 && cellIndex <= zone.x2) {
                    cell.css('background-color', zoneGrid.colors[i]);
                    cell.attr('data-zone', i);
                }
            }
            // Place event
            cell.on('click', cellClick);
            cell.on('mouseover', cellOver);
        }
    }

    // Re-attaching click events
    removeBulbsFromZone();
    $('.delete-zone-btn').on('click', function() {
        clearZone($(this).data('id'));
    });
}

// Builds the forms for bulb selection
function updateZoneContainers() {
    $('#zone-bulbs').html('');
    for (var zoneIndex in zoneGrid.zonesTemp) {
        var zone = zoneGrid.zonesTemp[zoneIndex],
            color = zoneGrid.colors[zoneIndex],
            dataAttr = 'data-id="' + zoneIndex + '" data-bulbs="' + zone.bulbs + '" data-x1="' + zone.x1 + '" data-x2="' + zone.x2 + '" data-y1="' + zone.y1 + '" data-y2="' + zone.y2 + '"',
            html =  '<div class="zone-container" style="background-color: ' + color + ';"' + dataAttr + '">' +
                    '<i class="fa fa-close delete-zone-btn" data-id="' + zoneIndex + '"></i>' +
                    '<div class="zone-bulbs-wrapper">';

        // Add bulb objects
        for (var i=0; i<zone.bulbs.length; i++) {
            html += getZoneBulbWrapperHtml(zone.bulbs[i]);
        }

        html += getAddBulbsDiv();
        html += '</div>';
        html += '<i class="fa fa-plus-square add-zone-bulbs-btn"></i></div>';

        $('#zone-bulbs').append(html);
    }
}

// Remove zone from zoneGrid object, rebuild grid
function clearZone(zoneIndex) {
    notification('Removing zone');
    zoneGrid.zonesTemp.splice(zoneIndex, 1);
    updateGridLights();
    buildGrid();
}

function removeBulbsFromZone() {
    $('.delete-zone-bulb-btn').on('click', function() {
        var wrapper = $(this).parent(),
            container = $(this).parents('.zone-container'),
            zoneIndex = container.data('id'),
            bulbId = $(this).data('id').toString(),
            bulbs = container.attr('data-bulbs').split(','),
            newBulbs = [];

        for (var i=0; i<bulbs.length; i++) {
            if (bulbId !== bulbs[i]) {
                newBulbs.push(bulbs[i]);
            }
        }

        wrapper.remove();
        zoneGrid.availableLights.push(bulbId);
        zoneGrid.zonesTemp[zoneIndex].bulbs = newBulbs;
        container.attr('data-bulbs', newBulbs);

        updateGridLights();
        buildGrid();
    });
}

// Events for the add bulbs to zone menus
function addBulbsToZone() {
    $('.add-zone-bulbs-btn').on('click', function() {
        var zoneIndex = $(this).data('id'),
            zone = zoneGrid.zonesTemp[zoneIndex],
            wrapper = $(this).parent().find('.add-bulbs-to-zone-wrapper');

        if (zoneGrid.availableLights.length > 0) {
            wrapper.removeClass('hidden');
        } else {
            notification('No active lights available to assign to this zone');
        }
    });

    $('.close-add-bulbs-to-zone-wrapper').on('click', function() {
       $(this).parent().addClass('hidden');
    });

    $('.available-bulb').on('click', function() {
        $(this).toggleClass('available-bulb-selected');
    });

    $('.add-bulbs-to-zone-confirm').on('click', function() {
        var container = $(this).parents('.zone-container');
        $(this).parent().addClass('hidden');
        updateZoneBulbs(container);
        updateGridLights();
        buildGrid();
    });
}

// Updates bulbs property of zone
function updateZoneBulbs(container) {
    var wrapper = container.find('.add-bulbs-to-zone-wrapper'),
        selectedBulbs = container.attr('data-bulbs').split(','),
        selectedBulbsNew = [];

    for (var i=0; i<selectedBulbs.length; i++) {
        if (selectedBulbs[i].length) {
            selectedBulbsNew.push(selectedBulbs[i]);
        }
    }

    wrapper.find('.available-bulb').each(function() {
       if ($(this).hasClass('available-bulb-selected')) {
           var lightId = $(this).data('id');
           selectedBulbsNew.push(lightId.toString());
       }
    });
    zoneGrid.zonesTemp[container.data('id')].bulbs = selectedBulbsNew;
}

// DOM Building Helper Functions
function getAddBulbsDiv() {
    var html =  '<div class="add-bulbs-to-zone-wrapper hidden">' +
                '<i class="fa fa-times close-add-bulbs-to-zone-wrapper"></i>' +
                '<div class="available-bulbs-wrapper"><span class="available-bulbs-title">Available Bulbs</span>';


    for (var i=0; i<zoneGrid.availableLights.length; i++) {
        var lightId = zoneGrid.availableLights[i];
        html += '<div class="available-bulb" data-id="' + lightId + '">' +
                '<i class="fa fa-lightbulb-o"></i>' +
                '<span class="available-bulb-label">' + zoneGrid.lightsMaster[lightId] + '</span>' +
                '</div>';
    }

    html += '</div><div class="add-bulbs-to-zone-confirm">Add Bulbs</div></div>';
    return html;
}

function getZoneBulbWrapperHtml(bulbId) {
    var bulb = zoneGrid.lightsMaster[bulbId];
    return  '<div class="zone-bulb-wrapper">' +
            '<i class="fa fa-close delete-zone-bulb-btn" data-id="' + bulbId +'"></i>' +
            '<i class="fa fa-lightbulb-o zone-bulb"></i>' +
            '<div class="zone-bulb-label">' + bulb + '</div></div>';
}

//== HTML Grid Helper Functions ===================================================================
//preview mode
function cellOver() {
    if (zoneGrid.selectionStarted) {
        var curCell = $(this),
            corners = getCorners(zoneGrid.startCell, curCell);
        clearPixels();
        selectZone(corners, false); //just preview
    }
}

//on click, for start or stop selection
function cellClick() {
    var curCell = $(this);

    if (zoneGrid.availableLights.length > 0) {
        //first click to start selection
        if (!zoneGrid.selectionStarted) {
            zoneGrid.startCell = curCell;
            markCell(curCell, true);
            zoneGrid.selectionStarted = true;
        } else {
            //second click to end selection
            zoneGrid.endCell = curCell;
            zoneGrid.selectionStarted = false;
            var corners = getCorners(zoneGrid.startCell, zoneGrid.endCell);
            validateZone(corners);
            buildGrid();
        }
    } else {
        notification('No active lights are available for a new zone');
    }
}

//get the top left and bottom right corners from two cells
function getCorners(cellA, cellB) {
    return {
        'x1': Math.min(cellA.attr('id').split('-')[2], cellB.attr('id').split('-')[2]),
        'y1': Math.min(cellA.attr('id').split('-')[1], cellB.attr('id').split('-')[1]),
        'x2': Math.max(cellA.attr('id').split('-')[2], cellB.attr('id').split('-')[2]),
        'y2': Math.max(cellA.attr('id').split('-')[1], cellB.attr('id').split('-')[1])
    };
}

// Called when a new zone is created
function validateZone(corners) {
    corners.bulbs = [];
    zoneGrid.zonesTemp.push(corners); // add zone to zoneGrid object

    selectZone(corners, true); // update color and mark as selected
    updateGridLights();
    buildGrid();
}

//clear unselected pixels
function clearPixels() {
    for (var lineIndex=0; lineIndex<zoneGrid.height; lineIndex++) {
        for (var cellIndex=0; cellIndex<zoneGrid.width; cellIndex++) {
            //restoring default color
            var curCell = $('#cell-' + lineIndex + "-" + cellIndex);
            if (!curCell.hasClass('selected')) {
                curCell.css('background-color', zoneGrid.defaultColor);
            }
            //restoring zone zone-colors
            $.each(zoneGrid.zonesTemp, function(zoneIndex, zone) {
                if (lineIndex >= zone.y1 && lineIndex <= zone.y2 && cellIndex >= zone.x1 && cellIndex <= zone.x2) {
                    curCell.css('background-color', zoneGrid.colors[zoneIndex]);
                }
            });
        }
    }
}

function markCell(cell, validate) {
    if (validate === true) {
        cell.addClass('selected');
    }
    cell.css({
        'background-color': zoneGrid.colors[zoneGrid.zonesTemp.length]
    });
}

//change the color of cells, and add class 'selected' if validate is true
function selectZone(corners, validate) {
    for (var lineIndex=corners.y1; lineIndex<=corners.y2; lineIndex++) {
        for (var cellIndex=corners.x1; cellIndex<= corners.x2; cellIndex++) {
            var cellId = "cell-" + lineIndex + "-" + cellIndex,
                cell = $('#' + cellId);
            markCell(cell, validate);
        }
    }
}

//== AJAX Calls ===================================================================================
// Grabs values from DOM, sends to server to be persisted
function saveGridResults() {
    zoneGrid.zones = [];
    $('.zone-container').each(function() {
        var zoneIndex = $(this).data('id'),
            bulbs = $(this).attr('data-bulbs').split(','),
            x1 = $(this).data('x1'),
            x2 = $(this).data('x2'),
            y1 = $(this).data('y1'),
            y2 = $(this).data('y2');

        if (bulbs != '') {
            zoneGrid.zones[zoneIndex] = {};
            zoneGrid.zones[zoneIndex].bulbs = bulbs;
            zoneGrid.zones[zoneIndex].x1 = x1;
            zoneGrid.zones[zoneIndex].x2 = x2;
            zoneGrid.zones[zoneIndex].y1 = y1;
            zoneGrid.zones[zoneIndex].y2 = y2;
        }
    });
    zoneGrid.zonesTemp = zoneGrid.zones.slice(0);

    $.ajax({
        url		    : $SCRIPT_ROOT + zoneGrid.updateZonesUrl,
        method		: 'POST',
        contentType	: 'application/json;charset=UTF-8',
        data		: JSON.stringify(zoneGrid.zones),
        success: function (result) {
            console.log(result);
            updateGridLights();
            buildGrid();
            notification(result['message']);
        },
        error: function (result) {
            console.log(result);
        }
    });
}

function toggleZoneMode() {
    var zoneStateDiv = $('#zone-state'),
        settingCircle = $('#zoneBtn.setting-circle');

    if (zoneGrid.state) {
        zoneStateDiv.html('Off');
        zoneGrid.state = 0;
    } else {
        zoneStateDiv.html('On');
        zoneGrid.state = 1;
    }
    $.ajax({
        url			: $SCRIPT_ROOT + zoneGrid.toggleZonesUrl,
        method		: 'POST',
        contentType	: 'application/json;charset=UTF-8',
        data		: JSON.stringify(zoneGrid.state),
        success: function (result) {
            console.log(result);
            notification(result['message']);
            settingCircle.removeClass('setting-clicked');
        },
        error: function (result) {
            console.log(result);
        }
    });
}