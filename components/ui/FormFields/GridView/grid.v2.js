app.directive('gridView', function($timeout, $http) {
    return {
        require: '?ngModel',
        scope: true,
        compile: function(element, attrs, transclude) {
            var columnRaw = element.find("data[name=columns]:eq(0)").text();
            element.find("data[name=columns]:eq(0)").remove();

            return function($scope, $el, attrs, ctrl) {
                // define current form field in parent scope
                var parent = $scope.getParent($scope);
                $scope.name = $el.find("data[name=name]:eq(0)").html().trim();
                parent[$scope.name] = $scope;

                // define vars
                $scope.loading = false;
                $scope.loaded = false;
                $scope.Math = window.Math;
                $scope.mode = 'full';
                $scope.classAlias = $el.find("data[name=class_alias]").html().trim();
                $scope.modelClass = $el.find("data[name=model_class]").text();
                $scope.renderID = $el.find("data[name=render_id]").text();
                $scope.gridOptions = JSON.parse($el.find("data[name=grid_options]:eq(0)").text());
                $scope.columns = JSON.parse(columnRaw);
                $scope.columnsParams = JSON.parse($el.find("data[name=columnsfp]:eq(0)").text());
                $scope.defaultPageSize = $el.find("data[name=dpz]:eq(0)").text();
                $scope.datasource = parent[$el.find("data[name=datasource]:eq(0)").text()];            
                $scope.vScroll = $el.find("data[name=vScroll]:eq(0)").html();
                $scope.hScroll = $el.find("data[name=hScroll]:eq(0)").html();                
                
                $scope.checkboxCol = false;
                $scope.checkMode = function() {
                    if ($el.width() < 750) {
                        $scope.mode = 'small';
                    }
                    else {
                        $scope.mode = 'full';
                    }
                }
                $scope.url = function(a, b, c) {
                    return Yii.app.createUrl(a, b, c);
                };

                $scope.openDatePicker = function ($event, index) {
                    $event.preventDefault();
                    $event.stopPropagation();                    
                    $vl = $($event.currentTarget); 
                    $dl = $($vl.parent().prev());                    
                    if ($dl.is(':visible')) {                        
                        $dl.hide();
                    } else {                       
                        $el.find('ul[datepicker-popup-wrap]').hide();
                        var pos = $vl.parent().parent().position();
                        $dl.hide();
                        $dl.css({'top' : pos.top + 55 + 'px'});                                                                     
                        $dl.show();
                        var bounding = $dl[0].getBoundingClientRect();
                        if (bounding.bottom > (window.innerHeight || document.documentElement.clientHeight)) {
                            $dl.css({'top' : pos.top - $dl.height() + 'px'});
                        }                        
                    }
                };    

                $scope.handleHover = function(){                              
                    var tds = $el.find('table tbody tr.r td');   
                    tds.hover(function() {                        
                        $el = $(this);                      
                        $el.parent().prev().find("td[rowspan]").addClass("hover");
                      }, function() {                       
                        $el.parent().prev().find("td[rowspan]").removeClass("hover");                        
                    });
                   
                }
                $scope.getSequence = function(row, idx) {
                    if (!!row.$type) {
                        if (row.$type === 'r') {
                            return row.$index;
                        }
                    }
                    else return idx;
                }

                $scope.gridOptions.controlBar = $scope.gridOptions.controlBar !== 'false';
                $scope.rowClass = function(row, colName, colType) {
                    var agrStr = '';
                    if (typeof row[colName] !== "undefined" && row[colName] !== null && row[colName].toString) {
                        agrStr = row[colName].toString();
                    }

                    var rc = {
                        aggregate: row.$type == 'a' && agrStr != ''
                    };

                    rc['t-' + colType] = true;
                    rc['row-' + (row.$type || 'r')] = true;
                    rc['lv-' + (row.$level || 0)] = true;

                    return rc;
                }
                $scope.paste = function(e, row, ridx, col, cidx) {
                    var raw = e.originalEvent.clipboardData.getData('text');
                    var pasted = raw.trim().split("\n");                    
                    if (pasted.length >= 1) {
                        e.preventDefault();
                        $timeout(function() {
                            for (var r in pasted) {
                                var items = pasted[r].split("\t");
                                for (var c in items) {
                                    if (!$scope.datasource.data[parseInt(ridx) + parseInt(r)]) {
                                         $scope.datasource.data[parseInt(ridx) + parseInt(r)] = {}
                                    }
                                    
                                    var cname = $scope.columns[parseInt(cidx) + parseInt(c)].name;
                                    $scope.datasource.data[parseInt(ridx) + parseInt(r)][cname] = items[c] + ''
                                }
                            }
                        });
                    }
                }
                
                $scope.getCaretPosition = function(editableDiv) {
                    var caretPos = 0,
                        sel, range;
                    if (window.getSelection) {
                        sel = window.getSelection();
                        if (sel.rangeCount) {
                            range = sel.getRangeAt(0);
                            if (range.commonAncestorContainer.parentNode == editableDiv) {
                                caretPos = range.endOffset;
                            }
                        }
                    } else if (document.selection && document.selection.createRange) {
                        range = document.selection.createRange();
                        if (range.parentElement() == editableDiv) {
                            var tempEl = document.createElement("span");
                            editableDiv.insertBefore(tempEl, editableDiv.firstChild);
                            var tempRange = range.duplicate();
                            tempRange.moveToElementText(tempEl);
                            tempRange.setEndPoint("EndToEnd", range);
                            caretPos = tempRange.text.length;
                        }
                    }
                    return caretPos;
                }
                
                $scope.editKey = function(e) {
                    var ngModel = $(e.target).attr('ng-model');
                    var sel = window.getSelection();
                    var textLength = $(e.target).text().length;
                    if (e.which == 13)
                    {
                        if (e.preventDefault) {
                            e.preventDefault();
                        } else {
                            e.returnValue = false;
                        }
                        
                        var nextRow = $(e.target).parents("tr").next().find('[contenteditable][ng-model="' + ngModel + '"]');

                        if (!!nextRow) {
                            if(nextRow[0] != undefined)
                            {
                                $timeout(function() {
                                    nextRow.focus();
                                });    
                            }
                            else
                            {
                                var curTable = $(e.target).parents("tbody");
                                var curRow = $(e.target).parents("tr")
                                var curCol = $(e.target).parents("td")
                                var curColIdx = curRow.find("td").index(curCol);
                                var firstRow = curTable.find("tr:first-child");
                                var nextCol = firstRow.find("td:eq(" + (curColIdx + 1) + ")");
                                
                                if (nextCol) {
                                    var nextColTextBox = nextCol.find("[contenteditable]");
                                    if (!!nextColTextBox) {
                                        $timeout(function() {
                                            nextColTextBox.focus();    
                                        });
                                    }
                                }
                            }   
                        }
                    }
                    
                    if (textLength == sel.getRangeAt(0).endOffset || e.altKey) {
                        if (e.which == 40) {
                            var nextRow = $(e.target).parents("tr").next().find('[contenteditable][ng-model="' + ngModel + '"]');
                            if (!!nextRow) {
                                $timeout(function() {
                                    nextRow.focus();
                                });
                            }
                        }
                        else if (e.which == 39) {
                            var nextCol = $(e.target).parents("td").next().find('[contenteditable]');
                            if (!!nextCol) {
                                $timeout(function() {
                                    nextCol.focus();
                                });
                            }
                        } 
                    }

                    if (sel.getRangeAt(0).endOffset == 0 || e.altKey) {
                        if (e.which == 38) {
                            var prevRow = $(e.target).parents("tr").prev().find('[contenteditable][ng-model="' + ngModel + '"]');
                            if (!!prevRow) {
                                $timeout(function() {
                                    prevRow.focus();
                                });
                            }
                        }
                        else if (e.which == 37) {
                            var prevCol = $(e.target).parents("td").prev().find('[contenteditable]');
                            if (!!prevCol) {
                                $timeout(function() {
                                    prevCol.focus();
                                });
                            }
                        }
                    }
                }
                $scope.rowStateClass = function(row) {
                    if ($scope.checkboxCol === false) {
                        $scope.checkboxCol = {};
                        for (var i in $scope.columns) {
                            if ($scope.columns[i].columnType == 'checkbox') {
                                $scope.checkboxCol[$scope.columns[i].name] = $scope.columns[i].checkedValue;
                            }
                        }
                    }

                    var checkboxClass = [];
                    for (var i in $scope.checkboxCol) {
                        if (row[i] == $scope.checkboxCol[i]) {
                            if (checkboxClass.length == 0) {
                                checkboxClass.push('row-checked');
                            }

                            checkboxClass.push(i);
                        }
                    }
                    checkboxClass = checkboxClass.join(" ");

                    if (!row.$rowState || $scope.gridOptions.showRowState == 'false') {
                        return checkboxClass + ' ';
                    }
                    else {
                        return checkboxClass + ' row-state-' + row.$rowState;
                    }
                }
                $scope.rowUndoState = function(row) {
                    var hash = {},
                        trans = {
                            insert: 'insertData',
                            edit: 'updateData',
                            remove: 'deleteData'
                        }

                    var diffData = $scope.datasource[trans[row.$rowState]];
                    if (row.$rowState == 'edit' || row.$rowState == 'remove') {
                        var pk = $scope.datasource.primaryKey;
                        for (i in diffData) {
                            if (diffData[i][pk] == row[pk]) {
                                diffData.splice(i, 1);
                                break;
                            }
                        }

                        $scope.updatePaging($scope.gridOptions.pageInfo);
                    }
                    else if (row.$rowState == 'insert') {
                        var idx = diffData.indexOf(row);
                        diffData.splice(idx, 1);

                        var didx = $scope.datasource.data.indexOf(row);
                        $scope.datasource.data.splice(didx, 1);
                        return;
                    }
                }

                $scope.addRow = function(focus) {
                    var newModel = {};
                    if (!!$scope.model) {
                        newModel = angular.copy($scope.model);
                    }
                    $scope.datasource.data.unshift(newModel);

                    if (!!focus) {
                        $scope.focusAddRow();
                    }
                }
                $scope.focusAddRow = function() {
                    $timeout(function() {
                        if ($el.find("table tr.row-state-insert:eq(0) div[contenteditable]").length > 0) {
                            $el.find("table tr.row-state-insert:eq(0) div[contenteditable]")[0].focus();
                        }
                    }, 100);
                }

                $scope.removeRow = function(row) {
                    if (row.$rowState == 'insert') {
                        var idx = $scope.datasource.insertData.indexOf(row);
                        $scope.datasource.insertData.splice(idx, 1);

                        var didx = $scope.datasource.data.indexOf(row);
                        $scope.datasource.data.splice(didx, 1);
                        return;
                    }
                    else {
                        row.$rowState = 'remove';
                        $scope.datasource.deleteData.push(row);
                    }

                    $timeout(function() {
                        // $scope.recalcHeaderWidth();
                    });
                }

                $scope.undoRemoveRow = function(row) {
                    switch (row.$rowState) {
                        case 'remove':
                            var idx = $scope.datasource.deleteData.indexOf(row);
                            $scope.datasource.deleteData.splice(idx, 1);
                            break;
                        case 'edit':
                            var idx = $scope.datasource.updateData.indexOf(row);
                            $scope.datasource.updateData.splice(idx, 1);
                            $scope.datasource.query();
                            break;
                    }
                    row.$rowState = '';
                    $timeout(function() {
                        // $scope.recalcHeaderWidth();
                    });
                }

                // when ng-model is changed from inside directive
                $scope.update = function() {
                    if (!!ctrl) {
                        ctrl.$setViewValue($scope.value);
                    }
                };

                // page Setting
                $scope.range = function(n) {
                    return new Array(n);
                };
                $scope.scrollTop = function() {
                    $container.scrollTop($container.scrollTop() + $el.position().top - 53);
                };
                $scope.reset = function() {
                    $scope.resetPageSetting();
                    location.reload();
                }
                $scope.savePageSetting = function() {
                    if (!$scope.pageSetting) return;

                    $scope.showChangePage = false;
                    $scope.pageSetting.dataGrids = $scope.pageSetting.dataGrids || {};
                    $scope.pageSetting.dataGrids[$scope.name] = {
                        sort: $scope.gridOptions.sortInfo,
                        paging: $scope.gridOptions.pageInfo
                    };
                }
                $scope.loadPageSetting = function() {
                    var changing = false;
                    if (typeof $scope.gridOptions.pageSize != "undefined") {
                        $scope.gridOptions.pageInfo.pageSize = $scope.gridOptions.pageSize * 1;
                        $scope.updatePaging($scope.gridOptions.pageInfo, false);
                        changing = true;
                    }

                    if (!!$scope.pageSetting && !!$scope.pageSetting.dataGrids && !!$scope.pageSetting.dataGrids[$scope.name]) {
                        if (JSON.stringify($scope.gridOptions.sortInfo) != JSON.stringify($scope.pageSetting.dataGrids[$scope.name].sort)) {
                            $scope.gridOptions.sortInfo = $scope.pageSetting.dataGrids[$scope.name].sort;
                            $scope.updateSorting($scope.gridOptions.sortInfo, false);
                            changing = true;
                        }

                        if (JSON.stringify($scope.gridOptions.pageInfo) != JSON.stringify($scope.pageSetting.dataGrids[$scope.name].paging)) {
                            if (typeof $scope.pageSetting.dataGrids[$scope.name].paging != "undefined") {
                                $scope.gridOptions.pageInfo = $scope.pageSetting.dataGrids[$scope.name].paging;

                                $scope.updatePaging($scope.gridOptions.pageInfo, false);
                                changing = true;
                            }
                        }
                    }

                    if (changing) {
                        $scope.datasource.query();
                    }
                    else {
                        if ($scope.datasource.lastQueryFrom != "DataFilter") {
                            $scope.datasource.enableTrackChanges('GridView:LoadPageSetting');
                        }
                    }
                }

                // update sorting
                $scope.sort = function(col) {
                    if (col == '') return;

                    var direction = $scope.isSort(col, 'asc') ? 'desc' : 'asc';
                    $scope.gridOptions.sortInfo = {
                        fields: [col],
                        directions: [direction]
                    };
                    $scope.updateSorting($scope.gridOptions.sortInfo);
                    $timeout(function() {
                        // $scope.recalcHeaderWidth();
                    });
                }
                $scope.isSort = function(col, dir) {
                    if (!$scope.gridOptions.sortInfo) return false;

                    var idx = $scope.gridOptions.sortInfo.fields.indexOf(col);
                    if (idx >= 0) {
                        if ($scope.gridOptions.sortInfo.directions[idx] == dir) {
                            return true;
                        }
                    }
                    return false;
                }
                $scope.updateSorting = function(sort, executeQuery) {
                    var ds = $scope.datasource;
                    if (typeof ds != "undefined") {
                        var order_by = [];
                        for (i in sort.fields) {
                            if (sort.fields[i] == '') {
                                return;
                            }
                            order_by.push({
                                field: sort.fields[i],
                                direction: sort.directions[i]
                            });
                        }

                        ds.lastQueryFrom = "GridView";
                        ds.updateParam('order_by', order_by, 'order');
                        if (typeof executeQuery == "undefined") {
                            executeQuery = true;
                        }
                        if (executeQuery) {
                            ds.queryWithoutCount();
                            $scope.savePageSetting();
                        }
                    }
                }

                $scope.hideGroup = function(item, e) {
                    e.stopPropagation();
                    e.preventDefault();

                    item.$hide = !item.$hide;
                    var loop = true;
                    var cursor = $(e.target).parents('tr').next();
                    while (loop) {
                        if (cursor.attr('lv') > item.$level || (cursor.hasClass('a') && cursor.attr('lv') >= item.$level)) {
                            if (item.$hide) {
                                cursor.addClass('hide');
                            }
                            else {
                                cursor.removeClass('hide');
                            }
                            cursor = cursor.next();
                        }
                        else {
                            loop = false;
                        }
                    }
                    // $scope.recalcHeaderWidth();
                }

                // update paging
                $scope.updatePaging = function(paging, executeQuery, oldpaging) {
                    var ds = $scope.datasource;
                    ds.updateParam('currentPage', paging.currentPage, 'paging');
                    ds.updateParam('pageSize', paging.pageSize, 'paging');
                    ds.updateParam('totalServerItems', paging.totalServerItems, 'paging');
                    ds.lastQueryFrom = "GridView";

                    paging.typingPage = paging.currentPage * 1;
                    if (typeof executeQuery == "undefined") {
                        executeQuery = true;
                    }
                    if (executeQuery) {
                        if (typeof oldpaging != "undefined" && paging.pageSize == oldpaging.pageSize) {
                            ds.queryWithoutCount();
                        }
                        else {
                            ds.query(function() {

                            });
                        }
                        $scope.savePageSetting();
                    }
                }

                $scope.pagingKeyPress = function(e) {
                    if (e.which == 13) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $timeout(function() {
                        if (!$scope.loading) {
                            $scope.showChangePage = true;
                            if (e.which == 13) {
                                $scope.changePage();
                            }
                        }
                    });
                }

                $scope.changePage = function() {
                    $scope.gridOptions.pageInfo.currentPage = $scope.gridOptions.pageInfo.typingPage;
                    $scope.savePageSetting();
                }

                $scope.firstPage = function() {
                    $scope.gridOptions.pageInfo.currentPage = 1;
                    $scope.savePageSetting();
                }

                $scope.prevPage = function() {
                    $scope.gridOptions.pageInfo.currentPage -= 1;
                    if ($scope.gridOptions.pageInfo.currentPage <= 1) {
                        $scope.gridOptions.pageInfo.currentPage = 1;
                    }
                    $scope.savePageSetting();
                }

                $scope.currentPage = function() {
                    return $scope.gridOptions.pageInfo.typingPage;
                }
                $scope.totalPage = function() {
                    return Math.ceil($scope.datasource.totalItems / $scope.gridOptions.pageInfo.pageSize);
                }
                $scope.nextPage = function() {
                    $scope.gridOptions.pageInfo.currentPage += 1;
                    if ($scope.gridOptions.pageInfo.currentPage > $scope.datasource.totalItems) {
                        $scope.gridOptions.pageInfo.currentPage = $scope.datasource.totalItems;
                    }
                    $scope.savePageSetting();
                }
                $scope.lastPage = function() {
                    $scope.gridOptions.pageInfo.currentPage = $scope.datasource.totalItems;
                    $scope.savePageSetting();
                }

                $scope.deleteRow = function(idx) {
                    $scope.datasource.data.splice(idx, 1);
                }

                // fixed header on scroll
                var $container = $el.parents('.container-full');                
                var $header = $el.find("table.tdata > thead");
                var inViewport = function(el, offset) {
                    var rect = el[0].getBoundingClientRect();
                    var leftBoundary = $container.width();
                    var rightBoundary = 0;

                    if ($header.width() > leftBoundary) {
                        rightBoundary = leftBoundary - $header.width();
                    }

                    return (
                        rect.bottom >= parseInt($container.css('margin-top')) + offset &&
                        rect.right >= rightBoundary &&
                        rect.left < leftBoundary &&
                        rect.top < 0
                    );
                }

                $scope.freezedTh = [];
                $scope.freezedCols = [];
                $scope.recalcTBodyWidth = function(){
                    
                }
                $scope.recalcHeaderWidth = function() {

                    $scope.firstColWidth = $header.find("table.tdata th:eq(0)").outerWidth();
                    if ($scope.firstColWidth == 0) return;

                    $scope.paneV = $el.find('.pane-vScroll');                                                
                    $scope.paneVt = $el.find('.pane-vScroll > table');        
                    $scope.paneVt.width($scope.paneV.width() - 1);                    

                    // $timeout(function(){
                        var tds = $el.find('.table-vScroll > tbody > .r:nth-child(1) > td');                        
                        for(var c = 1;c <= tds.length; c++){
                            var td = $el.find('.table-vScroll > tbody > .r:nth-child(1) > td:nth-child('+c+')');
                            var th = $el.find('.table-vScroll > tbody > tr:last-child > th:nth-child('+c+')');
							var style = td.attr( "style" ); //get style attribute value
							if(style != undefined){
								var styleMap = style.split( ";" ).reduce( ( a, c ) => ( d = c.split( ":" ), a[d[0].trim()] =  String(d[1]).trim(), a ), {}); //get style map 

								th.outerWidth(styleMap["width"]);
							}
							
                        }                          
                    // })                    
                                    
                    
                
                }
                
                $scope.isCbFreezed = false;
                var paddingLeft = $el.offset().left;
                $scope.freezeControlBar = function() {
                    if (!!$scope.gridOptions.freezeControlBar || !!$scope.gridOptions.freeze) {
                        var w =  ($container.width() - (paddingLeft * 3));
                        $el.find('.data-grid-paging').css({
                            marginLeft: (($el.offset().left * -1) + paddingLeft) + 'px',
                            width: w === 0 ? 'auto' : w + 'px'
                        });
                    }
                    $scope.isCbFreezed = !!$scope.gridOptions.freezeControlBar || !!$scope.gridOptions.freeze;
                };

                $(window).resize(function() {                    
                    
                        $scope.recalcHeaderWidth();
                        $scope.checkMode();
                        $scope.freezeControlBar();                        
                    
                });

                function getScrollbarWidth() {
                    var div, body, W = window.browserScrollbarWidth;
                    if (W === undefined) {
                        body = document.body, div = document.createElement('div');
                        div.innerHTML = '<div style="width: 50px; height: 50px; position: absolute; left: -100px; top: -100px; overflow: auto;"><div style="width: 1px; height: 100px;"></div></div>';
                        div = div.firstChild;
                        body.appendChild(div);
                        W = window.browserScrollbarWidth = div.offsetWidth - div.clientWidth;
                        body.removeChild(div);
                    }
                    return W;
                };
                
                $scope.scrollBarWidth = getScrollbarWidth();
                // merge same row value
                $scope.mergeSameRowValue = function() {
                    $el.find('table tbody tr.r td.rowSpanned').removeClass('rowSpanned');
                    $el.find('table tbody tr.r td[rowspan]').removeAttr('rowspan');
                    var totalRow = $el.find('table tbody tr.r').length;

                    function mergeRow(c, el, row) {
                        var text = $(el).text();                        
                        if (c.$prevText === 'INITIAL-PREV-TEXT') {
                            c.$newRow = $(el);
                        }
                        if (!c.mergeSameRowMethod || c.mergeSameRowMethod.toLowerCase() == 'default') {                            
                            if (text != c.$prevText) {
                                if (c.$totalSpan > 1) {
                                    c.$newRow.attr('rowspan', c.$totalSpan);
                                    c.$prevRow.forEach(function(r) {
                                        var tr = r.closest('tr');
                                        var tds = tr.find('td');                                        
                                        if(tds.length > 0){
                                            for(s = 0; s < tds.length; s++){
                                                $(tds[s]).hover(function() {
                                                    $el = $(this);
                                                    $el.parent().addClass("hover");
                                                  
                                                    if ($el.parent().has('td[rowspan]').length == 0) {
                                                      $el
                                                        .parent()
                                                        .prevAll('tr:has(td[rowspan]):first')
                                                        .find('td[rowspan]')
                                                        .addClass("hover");
                                                    }
                                                  }, function() {
                                                    $el
                                                      .parent()
                                                      .removeClass("hover")
                                                      .prevAll('tr:has(td[rowspan]):first')
                                                      .find('td[rowspan]')
                                                      .removeClass("hover");
                                                  });
                                            }
                                        }
                                        r.addClass('rowSpanned');
                                    });
                                }

                                // reset new Row
                                c.$newRow = $(el);
                                c.$totalSpan = 1;
                                c.$prevRow.length = 0;
                            }
                            else if (!$(el).parent().prev().hasClass('group') && $(el).parent().hasClass('r')) {
                                c.$prevRow.push($(el));
                                c.$totalSpan++;
                            }
                        }

                        if (totalRow - 1 == row) {
                            if (c.$totalSpan > 1) {
                                c.$newRow.attr('rowspan', c.$totalSpan);
                                c.$prevRow.forEach(function(r) {
                                    var tr = r.closest('tr');
                                    var tds = tr.find('td');                                        
                                    if(tds.length > 0){
                                        for(s = 0; s < tds.length; s++){
                                            $(tds[s]).hover(function() {
                                                $el = $(this);
                                                $el.parent().addClass("hover");
                                              
                                                if ($el.parent().has('td[rowspan]').length == 0) {
                                                  $el
                                                    .parent()
                                                    .prevAll('tr:has(td[rowspan]):first')
                                                    .find('td[rowspan]')
                                                    .addClass("hover");
                                                }
                                              }, function() {
                                                $el
                                                  .parent()
                                                  .removeClass("hover")
                                                  .prevAll('tr:has(td[rowspan]):first')
                                                  .find('td[rowspan]')
                                                  .removeClass("hover");
                                              });
                                        }   
                                    }
                                    r.addClass('rowSpanned');
                                });
                            }
                        }

                        if (!!c.mergeSameRowMethod) {
                            if (c.$values.length == 0) {
                                c.$values.push(c.$prevText);
                            }
                            c.$values.push(text);
                        }

                        c.$prevText = text;
                        c.$prevRowIndex = c.$rowIndex;
                        c.$rowIndex = row;
                    }
                    $scope.mergeRowMethods = {
                        'Sum': function(values) {
                            var total = 0;
                            values.forEach(function(v) {
                                total += (v | 0)
                            });
                            return total;
                        },
                        'Average': function(values) {
                            var total = 0;
                            values.forEach(function(v) {
                                total += (v | 0)
                            });
                            return Math.round((total / values.length) * 100) / 100;
                        },
                        'Max': function(values) {
                            var max;
                            values.forEach(function(v, i) {
                                if (i == 0) {
                                    max = (v | 0);
                                }
                                else {
                                    max = Math.max(max, (v | 0));
                                }
                            });
                            return max;
                        },
                        'Count': function(values) {
                            return values.length;
                        },
                        'Min': function(values) {
                            var min;
                            values.forEach(function(v, i) {
                                if (i == 0) {
                                    min = (v | 0);
                                }
                                else {
                                    min = Math.min(min, (v | 0));
                                }
                            });
                            return min;
                        },
                        'Join': function(values, separator) {
                            separator = separator || ',';
                            return values.join(separator);
                        }
                    }

                    // loop each row to merge
                    $el.find('table tbody tr.r').each(function(rowIndex) {
                        for (var i = 0; i < $scope.columns.length; i++) {
                            var c = $scope.columns[i];
                            if (!!c.mergeSameRow && c.mergeSameRow == 'Yes') {
                                if (rowIndex == 0) {
                                    c.$newRow = null;
                                    c.$prevRow = [];
                                    c.$values = [];
                                    c.$execValues = [];
                                    c.$prevText = 'INITIAL-PREV-TEXT';
                                    c.$totalSpan = 1;
                                }                                
                                if (!!c.mergeSameRowWith && c.mergeSameRowWith != c.name) {                                    
                                    if (!c.$anchorCol) {
                                        $scope.columns.forEach(function(e, ei) {
                                            if (e.name === c.mergeSameRowWith && !!e.$prevText) {
                                                c.$anchorCol = e;
                                                c.$anchorIdx = ei;
                                            }
                                        }.bind(c));
                                    }

                                    if (!!c.$anchorCol && c.$anchorCol.mergeSameRow == 'Yes') {
                                        var el = $(this).find("td").eq(i);                                        
                                        if (c.$anchorCol.$rowIndex != rowIndex) {
                                            mergeRow(c.$anchorCol, $(this).find("td").eq(c.$anchorIdx), c.$anchorIdx);
                                        }

                                        if (c.$anchorCol.$totalSpan > 1) {
                                            mergeRow(c, el, rowIndex);
                                        }
                                        else {
                                            if (c.$totalSpan > 1) {
                                                c.$newRow.attr('rowspan', c.$totalSpan);
                                                c.$prevRow.forEach(function(r) {
                                                    r.addClass('rowSpanned');
                                                });
                                            }

                                            c.$newRow = $(el);
                                            if (!!c.mergeSameRowMethod && c.mergeSameRowMethod != "default") {
                                                if (!!c.$values && c.$values.length > 0) {
                                                    var colIdx = c.$newRow.index();
                                                    var lastRow = c.$newRow.parent().prev().find("td:eq(" + colIdx + ")");
                                                    c.$values.forEach(function(item, i) {
                                                        if (i < c.$values.length - 1) {
                                                            lastRow.addClass('rowSpanned');
                                                        }
                                                        else {
                                                            lastRow.attr('rowspan', c.$values.length);
                                                            if (typeof $scope.mergeRowMethods[c.mergeSameRowMethod] == 'function') {
                                                                lastRow.text($scope.mergeRowMethods[c.mergeSameRowMethod](c.$values));
                                                            }
                                                        }
                                                        lastRow = lastRow.parent().prev().find("td:eq(" + colIdx + ")");
                                                    });
                                                    c.$values = [];
                                                }
                                            }

                                            //reset row
                                            var text = $(el).text();
                                            c.$prevText = text;
                                            c.$prevRowIndex = c.$rowIndex;
                                            c.$rowIndex = rowIndex;
                                            c.$totalSpan = 1;

                                        }
                                    }

                                }
                                // if mergeWith == none (AND it is not merged yet)
                                else if (c.$rowIndex != rowIndex) {
                                    mergeRow(c, $(this).find("td").eq(i), rowIndex);
                                }
                            }
                        }
                    });

                    $scope.cleanRow();
                }

                $scope.cleanRow = function() {
                    $el.find('table tbody tr.a .rowSpanned').removeClass('rowSpanned').removeAttr('rowspan');
                    $el.find('table tbody tr.r.hide').removeClass('hide');
                }

                // checkbox handling
                $scope.checkbox = {};
                $scope.lastCheckbox = null;
                $scope.getModifyDS = function(col) {
                    if (!!col.options && !!col.options.modifyDataSource && col.options.modifyDataSource == 'false') {
                        return false;
                    }
                    return true;
                }
                $scope.clearCheckbox = function(col) {
                    $timeout(function() {
                        $scope.checkbox = {};
                        $scope.lastCheckbox = null;
                        $timeout(function() {
                            $el.find("input[class^='cb-'],input[class*=' cb-']").prop('checked', false);
                            $el.find(".row-checked").each(function() {
                                $(this).removeClass("row-checked");
                                $(this).find(".t-checkbox input").prop('checked', false);
                            });
                        });
                    });
                }
                $scope.checkboxValues = function(colName, column) {
                    var ret = [];
                    for (i in $scope.checkbox[colName]) {
                        if (typeof $scope.checkbox[colName][i][column] != "undefined") {
                            ret.push($scope.checkbox[colName][i][column])
                        }
                    }
                    return ret.join(",");
                }
                $scope.checkboxRow = function(row, colName, colIdx, e) {
                    var modify = $scope.getModifyDS($scope.columns[colIdx]);
                    if (typeof $scope.checkbox[colName] == "undefined") {
                        $scope.checkbox[colName] = [];
                    }
                    var isChecked = $scope.checkbox[colName].indexOf(row);
                    var rowFound = -1;
                    for (a in $scope.checkbox[colName]) {
                        if ($scope.checkbox[colName][a][$scope.datasource.primaryKey] == row[$scope.datasource.primaryKey]) {
                            rowFound = a;
                        }
                    }

                    if (typeof e !== "boolean") {
                        isChecked = $(e.target).is(":checked");
                        if ($scope.lastCheckbox !== null) {
                            if (e.shiftKey) {
                                var from = Math.min($scope.lastCheckbox.idx, this.$index);
                                var to = Math.max($scope.lastCheckbox.idx, this.$index);
                                for (var i = from; i < to; i++) {
                                    $scope.checkboxRow($scope.datasource.data[i], colName, colIdx, $scope.lastCheckbox.checked);
                                }
                            }
                        }
                        $scope.lastCheckbox = {
                            idx: this.$index,
                            data: row,
                            checked: isChecked
                        };
                    }
                    else {
                        isChecked = e;
                    }

                    if (isChecked) {
                        if (rowFound < 0) {
                            $scope.checkbox[colName].push(row);
                        }
                        if (modify) {
                            row[colName] = $scope.columns[colIdx].checkedValue;
                        }
                    }
                    else {
                        if (rowFound >= 0) {
                            $scope.checkbox[colName].splice(rowFound, 1);
                        }
                        if (modify) {
                            row[colName] = $scope.columns[colIdx].uncheckedValue;
                        }
                    }
                }
                $scope.downloadExcel = function() {
                    var availableHeader = [];
                    var rows = [];
                    var row = [];
                    $el.find('.pane-hScroll > .table-vScroll > tbody:nth-child(1) > tr').each(function(i, e) {
                        $(e).find('th').each(function(j, f) {
                             if (i>0 || $(e).text().trim() != "") {
                                 availableHeader.push(j);  
                             }
                         });
                     });

                    $el.find('.pane-hScroll > .table-vScroll > tbody:nth-child(1) > tr').each(function(i, e) {
                        var row = [];
                        $(e).find('th').each(function(j, f) {
                            if (availableHeader.indexOf(j) >= 0 || j == 0) {
                                if (availableHeader.indexOf(j) >= 0) {
                                    row.push($(f).text().trim());
                                }
                                if ($(f).attr('colspan') > 0) {
                                    var cp = $(f).attr('colspan');
                                    for (var x = 0; x < cp - 1; x++) {
                                        row.push('');
                                    }
                                }
                            }
                        });
                        rows.push(row);
                    });

                    $el.find('.table-vScroll > tbody:nth-child(2) > tr').each(function(i, e) {
                        var row = [];
                        $(e).find('td').each(function(j, f) {
                            if (availableHeader.indexOf(j) >= 0) {
                                row.push($(f).text().trim());
                            }
                        });
                        rows.push(row);
                    });

                    $http.post(Yii.app.createUrl('/formfield/GridView.downloadExcel'), {
                        rows: rows
                    }).success(function(e) {
                        location.href = e;
                    });
                }
                $scope.checkboxGroup = function(rowIdx, colName, colIdx, e) {
                    var loop = true;
                    var modify = $scope.getModifyDS($scope.columns[colIdx]);
                    var cursor = $(e.target).parents("table").next().find('table tbody tr');                    
                    var level = (rowIdx == -1 ? -1 : $scope.datasource.data[rowIdx].$level);
                    if (level < 0) {
                        cursor = $el.find(".table-vScroll > tbody:nth-child(2) > tr:eq(0)");                                                                        
                    }                                        
                    var isChecked = $(e.target).is(":checked");
                    if(isChecked){
                        var checkedValue = $scope.columns[colIdx].checkedValue;    
                    } else {
                        var checkedValue = $scope.columns[colIdx].uncheckedValue;    
                    }
                    //loop through all rows
                    while (loop) {
                        var row = $scope.datasource.data[++rowIdx];
                        
                        if (!row) {
                            loop = false;
                            continue;
                        } else {
                            row[colName] = checkedValue;
                        }
                        if (row.$type == 'a' && row.$aggr == false) {
                            continue;
                        }

                        if (typeof $scope.checkbox[colName] == "undefined") {
                            $scope.checkbox[colName] = [];
                        }

                        if (cursor.attr("lv") > level) {
                            if (cursor.hasClass("r")) {
                                var rowFound = -1;
                                for (var a in $scope.checkbox[colName]) {
                                    if ($scope.checkbox[colName][a][$scope.datasource.primaryKey] == row[$scope.datasource.primaryKey]) {
                                        rowFound = a;
                                    }
                                }
                                if (level < 0 || cursor.find(".cbl-" + colName).length > 0) {
                                    if (isChecked) {
                                        if (rowFound < 0) {
                                            $scope.checkbox[colName].push(row);
                                        }
                                        if (modify) {
                                            row[colName] = $scope.columns[colIdx].checkedValue;
                                        }
                                    }
                                    else {
                                        if (rowFound >= 0) {
                                            $scope.checkbox[colName].splice(rowFound, 1);
                                        }
                                        if (modify) {
                                            row[colName] = $scope.columns[colIdx].uncheckedValue;
                                        }
                                    }
                                }
                            }
                            
                            else if (cursor.hasClass("g")) {
                                cursor.find(".cb-" + colName).prop('checked', isChecked);
                            }
                        }
                        else {
                            loop = false;
                        }
                        cursor = cursor.next();
                        if (cursor.length == 0) {
                            loop = false;
                        }
                    }
                }
                $scope.checkboxAll = function(colName, colIdx, e) {
                    $scope.checkboxGroup(-1, colName, colIdx, e);
                }
                $scope.checkboxRowChecked = function(row, colName, colIdx) {
                    if (!!$scope.getModifyDS($scope.columns[colIdx])) {
                        if (row[colName] == $scope.columns[colIdx].checkedValue) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    }
                    else {
                        if (!$scope.checkbox[colName]) return false;
                        for (a in $scope.checkbox[colName]) {
                            if ($scope.checkbox[colName][a][$scope.datasource.primaryKey] == row[$scope.datasource.primaryKey]) {
                                return true;
                            }
                        }
                        return false;

                    }
                }

                // when ng-model is changed from outside directive
                if (!!ctrl) {
                    // if ngModel is present, use that instead of value from php
                    if ($scope.inEditor && !$scope.$parent.fieldMatch($scope))
                        return;

                    if (typeof ctrl.$viewValue != "undefined") {
                        $scope.value = ctrl.$viewValue;
                        $scope.update();
                    }
                }
                
                $scope.assembleColumns = function(cols){
                    $header = $el.find("table.tdata > thead ");
                    //$el.find("table.tdata > thead > tr").remove();
                    
                    for(var i in cols){
                        
                    }
                    
                    //var newEle = angular.element("<tr><th cidx=\"2\" ridx=\"1\" style=\"width:200px;min-width:200px;max-width:200px;overflow-x: hidden;\"><div class=\"row-header\" ng-click=\"sort('dihitung_per_engine')\">Dihitung Per Engine<!----><!----></div></th></tr>");
                    
                   // angular.element($header).append(newEle);
                    
                }
                
                // initialize gridView
                $scope.initGrid = function() {
                    
                    $scope.gridOptions.pageInfo = {
                        pageSizes: [10, 25, 50, 100, 250, 500, 1000, 2000],
                        pageSize: $scope.defaultPageSize,
                        totalServerItems: $scope.datasource.totalItems,
                        currentPage: 1,
                        typingPage: 1
                    };
                    
                    $scope.$watch('gridOptions.pageInfo', function(paging, oldpaging) {
                        if (paging.typingPage != oldpaging.typingPage) return;
                        if (paging != oldpaging) {
                            var maxPage = Math.ceil($scope.datasource.totalItems / $scope.gridOptions.pageInfo.pageSize);
                        
                            if (isNaN($scope.gridOptions.pageInfo.currentPage) ||
                                $scope.gridOptions.pageInfo.currentPage == '' ||
                                $scope.gridOptions.pageInfo.currentPage <= 0) {
                                $scope.gridOptions.pageInfo.currentPage = 1;
                            }
                
                            if ($scope.gridOptions.pageInfo.currentPage > maxPage) {
                                $scope.gridOptions.pageInfo.currentPage = Math.max(maxPage, 1);
                            }
                
                            if (typeof $scope.datasource != "undefined" && typeof paging != "undefined") {
                                if ($scope.pagingTimeout != null) {
                                    clearTimeout($scope.pagingTimeout);
                                }
                
                                $scope.pagingTimeout = setTimeout(function() {
                                    $scope.updatePaging(paging, true, oldpaging);
                                }, 100);
                            }
                        }
                    }, true);
                    $timeout(function() {
                        if (!$scope.loaded) {
                            $scope.loaded = true;
                            $scope.onGridRender('timeout');                            
                        }
                        if (typeof window.resize == 'function') {
                            window.resize();
                        }
                    });
                    $timeout(function() {
                        $scope.datasource.beforeQueryInternal[$scope.renderID] = function() {
                            $scope.loading = true;
                            if ($scope.datasource.lastQueryFrom == "DataFilter" && !!$scope.gridOptions.pageInfo) {
                                $scope.gridOptions.pageInfo.currentPage = 1;
                            }
                            $scope.datasource.disableTrackChanges("GridView:initBeforeQuery");
                            $scope.lastCheckbox = null;
                        }
                        $scope.datasource.afterQueryInternal[$scope.renderID] = function() {
                            $scope.loading = false;
                            if (!$scope.loaded) {
                                $scope.loaded = true;
                            }
                            if (!$scope.datasource.trackChanges) {
                                $scope.datasource.resetOriginal();
                                $scope.datasource.enableTrackChanges('GridView:initAfterQuery');
                            }
                            $scope.lastCheckbox = null;
                            $scope.reloadTemplate();
                            if (typeof window.resize == "function") {
                                window.resize();
                            }                            
                        };                        
                        $scope.loadPageSetting();
                    });                                                                  
                };

                if (!$scope.datasource) {
                    alert("Error: " + $scope.name + " Please choose datasource!!")
                }
                else {
                    $scope.datasource.disableTrackChanges("Gridview:beforeInit");
                }

                $scope.gridRenderTimeout = null;
                $scope.onGridRender = function(flag) {
                    
                    if (flag == 'templateload') {
                        $scope.loading = true;
                        $header = $el.find("table.tdata > thead");
                        
                        if(typeof $scope.initColumns == 'function'){
                            $scope.columns = $scope.initColumns();    
                        }else{
                            $scope.columns = JSON.parse($el.find('script[name=columnsnew]').text());    
                        }                        
                        
                        $scope.freezedColsReady = false;
                    }

                    if ($scope.gridRenderTimeout !== null) {
                        $timeout.cancel($scope.gridRenderTimeout);
                    }                                        
                    $scope.gridRenderTimeout = $timeout(function() {
                        if($scope.name != 'gvTaskNoMergeRow'){
                            $scope.mergeSameRowValue(); //ini garai lelet                            
                        }                  
                        $timeout(function() {                     
                            $scope.recalcHeaderWidth();                                   
                            if($scope.name != 'gvTaskNoMergeRow'){
                                $scope.moveFreezedCols();
                            }                            
                            $scope.gridRenderTimeout = null;
                            $scope.loading = false;
                        });
                    });                      
                    $timeout(function() {
                        $scope.paneH = $el.find('.pane-hScroll');
                        $scope.paneV = $el.find('.pane-vScroll');                                                
                        $scope.paneVt = $el.find('.pane-vScroll > table');        
                        $scope.paneVt.width($scope.paneV.width() - 1);

                        $scope.paneH.scroll(function(){                                                  
                            $scope.paneV.width($scope.paneH.width() + $scope.paneH.scrollLeft());
                            $scope.paneVt.width($scope.paneV.width() - 1);
                        })                      
                    });                                          
                };
                
                $scope.freezedColsReady = false
                $scope.renderFreezedCols = function() {
                    if ($scope.freezedTh.length > 0) {
                        var toff = $el.find("table.tdata thead").offset();
                        var $tc = $el.find(".tcols-container");
                        var coff = $container.offset();
                        var th = $el.find("table.tdata").height();
                        var ch = $container.height();
                        var sout = th + toff.top - coff.top;
                        var sin = ch - $scope.scrollBarWidth - Math.max(toff.top - coff.top, 0);
                        if (sout > 0) {
                            $tc.css({
                                top: Math.max(toff.top, coff.top),
                                left: Math.max(toff.left, coff.left),
                                display: 'block',
                                maxHeight: Math.min(sout,sin)
                            });
                            var cs = $container.scrollTop();
                            var tboff= $el.find("table.tdata tbody").offset();
                            var voff = $scope.isCbFreezed ? 96 : 53
                            $el.find('.tcols.data').css({
                                marginTop: ((cs < voff ? cs /10 : cs - voff) * -1) + Math.abs(toff.top - tboff.top)
                            })
                        } else {
                            $tc.hide();
                        }
                    }
                }
                
                $scope.moveFreezedCols = function() {
                    $timeout(function() {
                        var width = 0;
                        var rows = $el.find('table.tdata tbody tr');
                        var rowlen = rows.length;
                        $scope.freezedCols.forEach(function(item, idx) {
                            rows.each(function(i) {
                                var el = $(this).find(">td:eq("+ item.idx +")")
                                if (i == 0) {
                                    var w = (el.outerWidth());
                                    width += w;
                                }
                                
                                var h = (el.outerHeight() - 1);
                                // el.replaceWith('<td><div style="width:'+ w +'px;height:'+ h +'px;"></div></td>');
                            });
                        });
                        
                        $el.find('table.tcols.data').css({
                            minWidth: width,
                            marginTop: $el.find('table.tdata thead').height()
                        })
                        
                        $scope.renderFreezedCols(); 
                        
                        $scope.freezedColsReady = true;
                    });
                }

                $scope.templateCacheKey = Date.now();
                $scope.templateUrl = "";
                $scope.reloadTemplate = function(columns) {
                    var params = {};
                    for (var i in $scope.columnsParams) {
                        if ($scope.columnsParams[i].indexOf('js:') == 0) {
                            params[i] = $scope.$eval($scope.columnsParams[i].substr(3));
                        }
                    }

                    $scope.loading = true;
                    $timeout(function() {
                        $scope.templateCacheKey = Date.now();                        
                        $scope.templateUrl = Yii.app.createUrl('formfield/GridView.template', {
                            n: $scope.name,
                            c: $scope.classAlias,
                            k: $scope.templateCacheKey,
                            p: JSON.stringify(params)
                        });
                    });

                    
                }

                if ($scope.columns.length > 0) {
                    $scope.reloadTemplate();
                }
                
                $scope.initGrid();
            };
        }
    }
});