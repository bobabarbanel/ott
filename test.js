

$(function () {
    
    function buildTable(data) {
        // data is the  [ [colum0, column1,...] ,[datforCol0, dataforCol1,... ], ...]
        var tab = $('<table>');
        var columns = data.shift; // names (columns) for all the fields
        buildHeaders(tab, columns);
        // now data has all the rows with numbers etc.
        for (row in data) {
            buildrows(tab, row); // each row is one [dat0, dat1, ....] tuple
        }
        return tab;
    }


    function buildHeaders(tab, columns) {
        var tr = $('<tr/>'); // new row for header
        // appends one <th> element to the row

        /////>> REMEMBER NOT ALL COLUNDS WILL BE INCLUDED (like 4)
        columns.forEach(header => tr.append($("<th/>").html(header)));
        tab.append(tr); // adds row to table
    }

    function buildRow(tab, row) {
        var tr = $('<tr/>'); // new row for data
        columns.forEach(datum => tr.append($("<td/>").html(datum)));
        tab.append(tr); // adds row to table
    }

    $('#years').on('click', function (e) {
        e.preventDefault();
        var arr = [];
        $('.yr_check:checked').each(function () {
            arr.push($(this).val());
        });
        console.log(arr);
    });
});