(function () {
    "use strict";
    Grid: function () {
        var actual = {},
            response = {},
            searchTimeout = 0,
            divSearch = {},
            divSearchField = {},
            divPageSize = {},
            divPagination = {},
            divTable = {},
            divDateRange = {},
            customEvents = [],
            url = "",
            downloadURL = "",
            isInitialized = false,
            opt = {},
            responseDataEvent = function () { },
            errorEvent = function () { },
            sortDirection = {},
            backupData = {};

        return {
            setCustomEvent: setCustomEvent,
            show: show,
            initialize: initialize,
            getObjectData: getObjectData,
            update: update,
            getCaptionsInHtml: getCaptionsInHtml,
            options: options,
            extraFilter: extraFilter,
            setCustomFilters: setCustomFilters,
            getCustomFilters: getCustomFilters,
            getResponseData: getResponseData,
            responseData: responseData,
            onError: onError,
            getData: getCustomData,
            getDateRange: getActualDateRange,
            downloadCSV: downloadCSV,
            restore: restore,
            backup: backup
        };

        function initialize(data) {
            url = data.URL;
            downloadURL = data.downloadURL;
            divSearch = data.divSearch || $("#VIBSearch");
            divSearchField = data.divSearchField || $("#VIBSearchField");
            divTable = data.divTable || $("#VIBTable");
            divPageSize = data.divPageSize || $("#VIBPageSize");
            divPagination = data.divPagination || $("#VIBPagination");
            divDateRange = data.divDateRange || $("#VIBDateRange");
            actual = new Reset();
            actual.Type = data.Type;
            actual.ExtraFilters = [];
            actual.CustomFilters = [];
            return this;
        }

        function setCustomEvent(event) {
            customEvents.push(event);
            return this;
        }

        function options(obj) {
            if (!obj) return this;
            opt.showFooter = obj.showFooter || false;
            opt.showCount = obj.showCount || false;
            opt.showTotal = obj.showTotal || false;
            opt.formatCell = obj.formatCell || false;
            opt.hideIdColumn = obj.hideIdColumn || false;
            opt.dateRange = obj.dateRange || false;
            opt.hideLoader = obj.hideLoader || false;
            opt.enableSort = obj.enableSort || false;
            opt.textFirstHeader = obj.textFirstHeader || "Id";
            opt.foreignKeyValue = obj.foreignKeyValue || "";
            return this;
        }

        function extraFilter(obj) {
            if (!actual.CustomFilters) {
                actual.CustomFilters = [];
            }
            if (obj && obj[1]) {
                var newValue = true;
                actual.CustomFilters.forEach(e => {
                    if (e && e.Key === obj[0]) {
                        [e.Key, e.Value] = obj;
                        newValue = false;
                    }
                });
                if (newValue) {
                    if (actual.CustomFilters) {
                        actual.CustomFilters.push({
                            Key: obj[0],
                            Value: obj[1]
                        });
                    } else {
                        actual.CustomFilters = [
                            {
                                Key: obj[0],
                                Value: obj[1]
                            }
                        ];
                    }
                }
            } else {
                actual.CustomFilters = actual.CustomFilters.filter(f => f.Key !== obj[0]);
            }
            actual.Page = 1;
            actual.PageSize = $(divPageSize).val();
            actual.SearchField = $(divSearchField).val() || response.FieldList[0];
            actual.SearchCriteria = $(divSearch).val();
            updateData();
        }

        function setCustomFilters(filters) {
            actual.CustomFilters = filters;
            actual.Page = 1;
            actual.PageSize = $(divPageSize).val();
            actual.SearchField = $(divSearchField).val() || response.FieldList[0];
            actual.SearchCriteria = $(divSearch).val();
            updateData();
        }

        function getCustomFilters() {
            return actual.CustomFilters;
        }

        function getResponseData() {
            return response;
        }

        function responseData(event) {
            responseDataEvent = event;
            return this;
        }

        function onError(event) {
            errorEvent = event;
        }

        function show() {
            isInitialized = false;

            divSearch.keyup(function () {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(function () {
                    actual.Page = 1;
                    actual.PageSize = $(divPageSize).val();
                    actual.SearchCriteria = divSearch.val();
                    actual.SearchField = $(divSearchField).val() || response.FieldList[0];
                    actual.CustomFilters = [];
                    updateData();
                }, 1000);
            });

            divPageSize.change(function () {
                actual.Page = 1;
                actual.PageSize = $(divPageSize).val();
                actual.SearchField = $(divSearchField).val() || response.FieldList[0];
                actual.SearchCriteria = $(divSearch).val();
                updateData();
            });

            if (opt.dateRange) {
                divDateRange.change(function () {
                    actual.Page = 1;
                    actual.PageSize = $(divPageSize).val();
                    actual.SearchField = $(divSearchField).val() || response.FieldList[0];
                    actual.SearchCriteria = $(divSearch).val();
                    if (getDateRange()) {
                        updateData();
                    }
                }).siblings("ul.select-dropdown").children("li").click((evt) => {
                    var value = $(evt.currentTarget).children("span")[0].innerText;
                    if (value === "Custom date") {
                        $("#RangeDateFrom").val("");
                        $("#RangeDateTo").val("");
                    }
                });
                getDateRange();
            }

            updateData();
        }

        function updateData() {
            getData(function (err) {
                if (err) {
                    return M.toast({ html: err });
                }
                let modelView = [];

                // With this we will build the modelView with the "key" from the FieldList and the "value" from Data
                if (response.Data) {
                    response.Data.forEach((a) => {
                        const row = {};
                        a.forEach((b, c) => {
                            row[response.FieldList[c]] = b;
                        });
                        modelView.push(row);
                    });
                }
                responseDataEvent(response, modelView);

                divTable.html("");
                updateTableHeader(divTable);
                updateTableBody(divTable);
                updateTableFooter(divTable);
                updatePagination(divPagination, actual.Page, response.TotalRecords, actual.PageSize);
                divShowCount(divPagination);
                updateSelect(divSearchField, response);
                initializeByCookie();
                setEvents();
                if (!divSearchField.val()) {
                    divSearchField.val($("#" + divSearchField.attr("id") + " option:first").val());
                    divSearchField.formSelect();
                }
                isInitialized = true;
                if (response.Data.length === 0) {
                    if (actual.Page > 1) {
                        actual.Page--;
                        return updateData();
                    }
                    M.toast({ html: "No data" });
                }
                return true;
            });
        }

        function divShowCount(div) {
            if (!opt.showCount) return;
            div.append($("<li>").addClass("left").text(opt.showCount + response.TotalRecords));
        }

        function divSearchFieldEvent() {
            actual.Page = 1;
            actual.SearchField = $(divSearchField).val();
            actual.PageSize = $(divPageSize).val();
            actual.SearchCriteria = $(divSearch).val();
            if (actual.SearchCriteria) {
                updateData();
            }
        }

        function setEvents() {
            customEvents.forEach(function (event) {
                event();
            });

            $("a[data-lookup]").click(function (evt) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(function () {
                    const search = evt.currentTarget.dataset.lookup;

                    if (search === "previous") {
                        if (actual.Page > 1) {
                            actual.Page--;
                        } else {
                            actual.Page = 1;
                        }
                    } else if (search === "next") {
                        const totalPages = Math.ceil(response.TotalRecords / parseInt(actual.PageSize));
                        if (actual.Page < totalPages) {
                            actual.Page++;
                        } else {
                            actual.Page = totalPages;
                        }
                    } else if (search === "first") {
                        actual.Page = 1;
                    } else if (search === "last") {
                        actual.Page = Math.ceil(response.TotalRecords / parseInt(actual.PageSize));
                    } else {
                        actual.Page = parseInt(search);
                    }

                    updateData();
                },
                    500);
            });

            $("#VIBTable thead tr th").click(function (evt) {
                if (!opt.enableSort) return;
                try {
                    const elements = $($(evt.currentTarget).html()).data("elements").split(","),
                        direction = sortDirection[`dir${this.cellIndex}`] || "ASC";
                    actual.Sort = {
                        Elements: elements,
                        Direction: direction
                    };
                    actual.Page = 1;
                    actual.PageSize = $(divPageSize).val();
                    actual.SearchField = $(divSearchField).val() || response.FieldList[0];
                    actual.SearchCriteria = $(divSearch).val();
                    sortDirection[`dir${this.cellIndex}`] = direction === "ASC" ? "DESC" : "ASC";
                    updateData();
                } catch (e) {
                    // :D
                }
            })
                .each(function (a, b) {
                    if ($($(b).html()).data("elements")) {
                        $(b).addClass("pointer");
                    }
                });

            $(".tooltipped").tooltip();
        }

        function getCustomData(callback) {
            getData((err) => {
                callback(err, response);
            });
        }

        function getActualDateRange() {
            const { DateFrom, DateTo } = actual;
            return { DateFrom: DateFrom, DateTo: DateTo };
        }

        function downloadCSV() {
            if (!downloadURL) return;
            const { data } = prepareData();
            downloadFile(downloadURL, data)
                .then(function (res) {
                    const { result, response } = res;
                    hideLoader();
                    var header = response.getResponseHeader("Content-Disposition");
                    const filename = header.match(/filename=(.+)/)[1];
                    var blob = new Blob([`\ufeff${result}`], { type: response.getResponseHeader("Content-Type") });
                    var link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }).catch(function (err) {
                    console.error(err);
                    hideLoader();
                });
        }

        function downloadFile(method, data) {
            return new Promise(function (res, rej) {
                $.ajaxSetup(
                    {
                        url: getBaseUrl() + method,
                        global: false,
                        type: 'POST',
                        timeout: 300000,
                        error: function (xhr) {
                            console.error(xhr);
                        }
                    });
                $.post(getBaseUrl() + method, data)
                    .done(function (result, success, response) {
                        res({ result: result, response: response });
                    })
                    .catch(function (err) {
                        rej(err.statusText || "Unkown error");
                    });
            });
        }

        function restore() {
            divSearch = backupData.divSearch;
            divSearchField = backupData.divSearchField;
            divTable = backupData.divTable;
            divPageSize = backupData.divPageSize;
            divPagination = backupData.divPagination;
            divDateRange = backupData.divDateRange;
        }

        function backup() {
            backupData = {
                divSearch: divSearch,
                divSearchField: divSearchField,
                divTable: divTable,
                divPageSize: divPageSize,
                divPagination: divPagination,
                divDateRange: divDateRange
            };
            return this;
        }

        function get(method) {
            return new Promise(function (res, rej) {
                $.ajaxSetup(
                    {
                        url: getBaseUrl() + method,
                        global: false,
                        type: 'GET',
                        timeout: ajaxTimeout
                    });
                $.get(getBaseUrl() + method)
                    .done(function (result, success, response) {
                        hideLoaderFn();
                        res(result, success, response);
                    })
                    .catch(function (err) {
                        hideLoaderFn();
                        rej(err);
                    });
            });
        }

        function post(method, data) {
            return new Promise(function (res, rej) {
                $.ajaxSetup(
                    {
                        url: getBaseUrl() + method,
                        global: false,
                        type: 'POST',
                        timeout: ajaxTimeout,
                        error: function (xhr) {
                            console.error(xhr);
                        }
                    });
                $.post(getBaseUrl() + method, data)
                    .done(function (result, success, response) {
                        hideLoaderFn();
                        res(result, success, response);
                    })
                    .catch(function (err) {
                        hideLoaderFn();
                        rej(err.statusText || "Unkown error");
                    });
            });
        }

        function getData(callback) {
            const { path, data } = prepareData();
            post(url, data)
                .then(function (res) {
                    hideLoader();
                    if (res.Success) {
                        $.cookie(path, JSON.stringify({ Data: data, Actual: actual }), { expires: new Date(moment().local().add(1, "days").format()) }, { path: "/" });
                        response = res.Results;
                        if (!response) {
                            callback(res.Message || "No data");
                        } else {
                            callback();
                        }
                    } else {
                        callback(res.Message);
                    }
                }).catch(function (err) {
                    console.error(err);
                    hideLoader();
                    callback(err);
                    errorEvent();
                });
        }

        function showLoader() {
            $("#main-loader").show();
        }

        function hideLoader() {
            $("#main-loader").hide();
        }

        function prepareData() {
            var data = new Request();
            if (opt.dateRange) {
                data.DateFrom = actual.DateFrom;
                data.DateTo = actual.DateTo;
            }
            if (!opt.hideLoader || !isInitialized) {
                showLoader();
            }
            if (opt.foreignKeyValue) {
                data.ForeignKeyFilter = {
                    Value: opt.foreignKeyValue,
                    Operator: 0,
                    AndOr: "AND",
                    ValueTo: ""
                };
            }
            const path = `vib-grid-${actual.Type.toString()}`;
            if ($.cookie(path) && !isInitialized) {
                let auxData = JSON.parse($.cookie(path)).Data;
                let auxActual = JSON.parse($.cookie(path)).Actual;
                for (let element in auxData) {
                    data[element] = auxData[element];
                }
                for (let element in auxActual) {
                    actual[element] = auxActual[element];
                }
            }
            data.PageSize = data.PageSize <= 0 ? 1 : data.PageSize;
            $.removeCookie(path, { path: "/" });
            $.removeCookie(path);
            return { data: data, path: path };
        }

        function initializeByCookie() {
            const path = `vib-grid-${actual.Type.toString()}`;
            if ($.cookie(path) && !isInitialized) {
                var data = JSON.parse($.cookie(path)).Actual;
                divPageSize.val(data.PageSize);
                divSearch.val(data.SearchCriteria);
                divSearchField.val(data.SearchField);
                divDateRange.val(data.DateRangeSelect);
                M.updateTextFields();
                $("select").formSelect();
            }
        }

        function getObjectData(id) {
            return {
                CaptionList: response.CaptionList,
                Data: response.Data.find(function (d) { return d[0] === parseInt(id); })
            };
        }

        function update() {
            updateData();
        }

        function getCaptionsInHtml(html) {
            return updateTableHeader(html);
        }

        function updateSelect(select, array) {
            if (!isInitialized) {
                var obj;
                if (response.CaptionListBackup) {
                    obj = response.CaptionListBackup.map(a => {
                        return {
                            key: a,
                            value: a.replaceAll(" ", "")
                        };
                    });
                } else {
                    obj = array.FieldList.map((a, b) => {
                        return {
                            value: a,
                            key: b === 0 ? "Id" : array.CaptionList[b - 1]
                        };
                    });
                }

                select.html("").change(divSearchFieldEvent);
                obj.forEach(function (f) {
                    select.append($("<option>").attr("value", f.value).text(f.key));
                });
                select.val(actual.SearchField);
                select.formSelect();
            }
            return;
        }

        function updateTableHeader(html) {
            const thead = html.children("thead").length === 0 ? $("<thead>") : html.children("thead");
            var row = $("<tr>");
            if (!opt.hideIdColumn) {
                row.append($("<th>").html(opt.textFirstHeader));
            }
            response.CaptionList.forEach(function (data) {
                row.append($("<th>").html(data));
            });
            return html.append(thead.append(row));
        }

        function updateTableBody(html) {
            if (html.children("tbody").length === 0) {
                html.append($("<tbody>"));
            }
            var dateFormat = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/;
            response.Data.forEach(function (data) {
                var row = $("<tr>").addClass("vib-row").attr("data-keyid", data[0]);
                data.forEach(function (d) {
                    if (dateFormat.test(d)) {
                        row.append($("<td>").html(moment(d).local().format("L")).data("value", new Date(d)));
                    } else {
                        row.append($("<td>").html(d).data("value", d));
                    }
                });
                html.append(row);
            });
            return html;
        }

        function updateTableFooter(html) {
            if (!opt.showFooter) return;

            const tfoot = $("<tfoot>").addClass("light-blue lighten-1");
            const row = $("<tr>");
            divPagination = $("<ul>").attr("id", "VIBPagination").attr("unselectable", "on")
                .addClass("pagination center");
            row.append($("<th>").attr("colspan", "3").append(divPagination));
            response.DataFooter.forEach(function (d) {
                row.append($("<th>").addClass("center").text(formatCurrency(d)));
            });
            row.append($("<th>"));
            tfoot.append(row);
            html.append(tfoot);
            return;
        }

        function formatCurrency(value) {
            return Intl.NumberFormat(getLang(), { style: "currency", maximumFractionDigits: 2, useGrouping: true, currency: "USD", currencyDisplay: "symbol" }).format(value || 0);
        }

        function getLang() {
            if (navigator.languages !== undefined)
                return navigator.languages[0];
            else
                return navigator.language;
        }

        function getDateRange() {
            switch (divDateRange.val()) {
                case "1": // Today
                    actual.DateFrom = moment().local().startOf("day").format();
                    actual.DateTo = moment().local().endOf("day").format();
                    break;
                case "2": // Last 30 days
                    actual.DateFrom = moment().local().add(-30, "days").startOf("day").format();
                    actual.DateTo = moment().local().endOf("day").format();
                    break;
                case "3": // Week to date
                    actual.DateFrom = moment().local().add(-7, "days").startOf("day").format();
                    actual.DateTo = moment().local().endOf("day").format();
                    break;
                case "5": // Year to date
                    actual.DateFrom = moment().local().startOf("year").format();
                    actual.DateTo = moment().local().endOf("day").format();
                    break;
                case "6": // Custom date

                    if ($("#RangeDateFrom").val()) {
                        actual.DateFrom = moment($("#RangeDateFrom").val()).local().startOf("day").format();
                        actual.DateTo = moment($("#RangeDateTo").val()).local().endOf("day").format();
                        actual.DateRangeSelect = divDateRange.val();
                        updateData();
                        return true;
                    }

                    createModal();
                    //divDateRange.val("0");
                    $("#DateRangeModal").FloatingCard({ width: 650 }).OpenCard();
                    $("#DateRangeButton").click(function () {
                        if (!$("#RangeDateFrom").val() || !$("#RangeDateTo").val() || !validRange()) {
                            return;
                        }
                        actual.DateFrom = moment($("#RangeDateFrom").val()).local().startOf("day").format();
                        actual.DateTo = moment($("#RangeDateTo").val()).local().endOf("day").format();
                        actual.DateRangeSelect = divDateRange.val();
                        updateData();
                        $("#DateRangeModal").CloseCard();
                    });
                    $("#DateRangeCancel").click(function () {
                        $("#DateRangeModal").CloseCard();
                    });
                    return false;
            }
            actual.DateRangeSelect = divDateRange.val();
            return true;
        }

        function createModal() {
            if ($("#DateRangeModal").html()) return;
            $("body").append(`<div id="DateRangeModal" class="card floating-card top-card hide">
                <div class="card-content">
                    <h5>Custom Date</h5>
                    <div class="row">
                        <div class="col s12 m6 l6">
                            <label for="RangeDateFrom">Value From :</label>
                            <input type="text" id="RangeDateFrom" class="datepicker" />
                        </div>
                        <div class="col s12 m6 l6">
                            <label for="RangeDateTo">Value To :</label>
                            <input type="text" id="RangeDateTo" class="datepicker" />
                        </div>
                    </div>
                </div>
                <div class="card-action">
                    <a id="DateRangeButton" class="card-action mc-card-action pointer">Ok</a>
                    <a id="DateRangeCancel" class="card-action mc-card-cancel pointer">Cancel</a>
                </div>
            </div>`);
            $(".datepicker").datepicker({
                onClose: function () {
                    if (!validRange()) {
                        //$(this).data('datepicker').inline = false;
                    }
                }
            }).on("change", function (evt) {
                if (evt.currentTarget.getAttribute("class").indexOf("picker__input--target") !== -1) {
                    if (!validRange()) {
                        return evt.preventDefault();
                    }
                    $(".picker__close").click();
                }
                return true;
            });
        }

        function updatePagination(div, page, totalRecords, pageSize) {
            const totalPageRecords = Math.ceil(totalRecords / pageSize);
            const total = totalPageRecords <= 10 ? totalPageRecords : totalPageRecords - page <= 5 ? totalPageRecords : Math.max(page + 4, 10);
            const init = total <= 10 ? 1 : total - 9;
            const previousValue = $("<a>").append($("<i>").addClass("material-icons").text("chevron_left"));
            const previous = $("<li>");
            div.html("");
            if (init !== 1) {
                div.append($("<li>").addClass("pointer").append($("<a>").addClass("tooltipped").attr("data-position", "top").attr("data-tooltip", "First page").attr("data-lookup", "first").append($("<i>").addClass("material-icons").text("first_page"))));
            }
            if (page === 1) {
                previous.addClass("disabled").append(previousValue);
            } else {
                previousValue.attr("data-lookup", "previous");
                previous.addClass("pointer tooltipped").attr("data-position", "top").attr("data-tooltip", "Previous").append(previousValue);
            }
            div.append(previous);

            for (let i = init; i <= total; i++) {
                div.append($("<li>").addClass(i === page ? "active pointer" : "pointer")
                    .append($("<a>").attr("data-lookup", i).text(i)));
            }

            const nextValue = $("<a>").addClass("tooltipped").attr("data-position", "top").attr("data-tooltip", "Next").append($("<i>").addClass("material-icons").text("chevron_right"));
            const next = $("<li>");
            if (page === total) {
                next.addClass("disabled").append(nextValue);
            } else {
                nextValue.attr("data-lookup", "next").addClass("pointer");
                next.addClass("pointer").append(nextValue);
            }
            div.append(next);
            if (totalPageRecords > 10 && totalPageRecords - page > 5) {
                div.append($("<li>").addClass("pointer").append($("<a>").addClass("tooltipped").attr("data-position", "top").attr("data-tooltip", "Last page").attr("data-lookup", "last").append($("<i>").addClass("material-icons").text("last_page"))));
            }
            if (totalPageRecords > 10) {
                div.append($("<li>").append($("<a>").addClass("tooltipped").attr("data-position", "top")
                    .attr("data-tooltip",
                        `There are more than ${pageSize * 10} matching results, please consider to refine the search criteria.`)
                    .append($("<i>").addClass("material-icons icon-yellow").text("warning"))));
            }
            return div;
        }

        function validRange() {
            if ($("#RangeDateFrom").val() && $("#RangeDateTo").val()) {
                const a = moment($("#RangeDateFrom").val());
                const b = moment($("#RangeDateTo").val());
                return a.diff(b) <= 0;
            }
            return true;
        }

        function Request() {
            return {
                LookUpObjectType: actual.Type,
                SearchField: actual.SearchField ? `[${actual.SearchField}]` : "",
                SearchCriteria: actual.SearchCriteria.sanitize().trim(),
                PageNumber: actual.Page,
                PageSize: actual.PageSize,
                Sort: actual.Sort,
                CustomFilters: actual.CustomFilters,
                ClientTimeZone: new Date().getTimezoneOffset()
            };
        }

        function Reset() {
            return {
                Page: 1,
                PageSize: $(divPageSize).val() || 10,
                SearchCriteria: "",
                SearchField: ""
            };
        }
    }
})();
