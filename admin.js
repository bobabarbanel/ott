jQuery.cachedScript = function(url, options) {
  // Allow user to set any option except for dataType, cache, and url
  options = $.extend(options || {}, {
    dataType: 'script',
    cache: true,
    url: url
  });

  // Use $.ajax() since it is more flexible than $.getScript
  // Return the jqXHR object so we can chain callbacks
  return jQuery.ajax(options);
};
const OLDPASS = '-- pending --';
const OUTOFDATE = '-- expired --';
const STATUS = {};

let table; // global
let new_count = 0; // global
// let product_list;
$(function() {
  const tableCode = [
    // order is important
    '/js/jquery-ui.min.js',
    '/js/tabulator.min.js',
    '/js/jquery_wrapper.min.js'
  ];
  $.cachedScript(tableCode[0]).done(function(/*script, zeroStatus*/) {
    $.cachedScript(tableCode[1]).done(function(/*script, oneStatus*/) {
      $.cachedScript(tableCode[2]).done(function(/*script, twoStatus*/) {
        getProducts($('#company').text()).then((product_names) =>
          tableSetup(product_names)
        );
      });
    });
  });

  $('#tabulator-controls  button[name=new_pass_to_clipboard]').prop(
    'disabled',
    true
  );
  $('button[name=quit]').on('click', () => {
    window.location.href = '/';
  });
  $('#note').css('visibility', 'hidden');
});

const initStatus = () => {
  const products = JSON.parse($('#limits').text());
  products.forEach((limits) => {
    STATUS[limits.product] = {
      max: limits.limit,
      active: 0,
      unvalidated: 0,
      expired: 0
    };
  });
};

const incrementStatus = (product_name, active, unvalidated, expired) => {
  const item = STATUS[product_name];
  item.active += active;
  item.unvalidated += unvalidated;
  item.expired += expired;
};

const showStatus = () => {
  const tbody = $('#status tbody').empty();
  $('#status').removeClass('outOfDate');

  Object.keys(STATUS).forEach((key) => {
    data = STATUS[key];
    tbody.append(
      $(`<tr>
      <th class="text-center" scope="row">${key}</th>
      <th class="text-center">${data.max}</th>
      <td class="text-center">${data.active}</td>
      <td class="text-center">${data.unvalidated}</td>
      <td class="text-center">${data.expired}</td>
      </tr>`)
    );
  });
};
const getProducts = async (site) => {
  return new Promise((resolve, reject) => {
    $.post({
      url: '/getProducts',
      data: { site: site },
      dataType: 'json'
    })
      .done((result) => {
        resolve(Object.keys(result)); // an array of Product names
      })
      .fail((error) => {
        alert('/getProducts Error ' + JSON.stringify(error, null, 4));
        reject(null);
      });
  });
};
const getUsers = async (site) => {
  return new Promise((resolve, reject) => {
    const NOW = new Date().valueOf();
    $.post({
      url: '/getUsers',
      data: { site: site },
      dataType: 'json'
    })
      .done((result) => {
        initStatus();
        const users = result[0].data.map((user, index) => {
          let expired = 0,
            unvalidated = 0,
            active = 0;

          if (user.temporary) {
            user.temporary = new Date(user.temporary).valueOf(); // always has an integer value for date in msec
            if (NOW > user.temporary) {
              expired = 1;
              user.new_pass = OUTOFDATE;
            } else {
              unvalidated = 1;
              user.new_pass = OLDPASS;
            }

            user.id = `new_${++new_count}`;
          } else {
            user.id = index + 1;
            user.new_pass = '';
            active = 1;
          }

          incrementStatus(user.product, active, unvalidated, expired);
          return user;
        });
        resolve(users);
      })
      .fail((error) => {
        alert('/getUsers Error ' + JSON.stringify(error, null, 4));
        reject(null);
      });
  });
};
const initforProduct = (acc, product) => {
  if (acc[product] === undefined) {
    acc[product] = {
      active: 0,
      pending: 0,
      expired: 0,
      poss_total: 0
    };
  }
};
const calculateNumToSave = () => {
  const acc = {};
  return table.getData().reduce((acc, user) => {
    const newPass = user.new_pass;
    const product = user.product;
    // console.log('acc',acc);
    initforProduct(acc, user.product);

    acc[product].poss_total++;
    if (newPass === '') {
      acc[product].active++;
    } else if (newPass === OLDPASS || newPass.match('^3D')) {
      acc[product].pending++; // pending or new
    } else {
      acc[product].expired++; // expired
    }
    return acc;
  }, acc);
};

const countWarning = (cell) => {
  const product = cell.getData().product;
  const acc = calculateNumToSave();
  let result = false;
  // console.log('countWarning max ? sum', STATUS[product].max, acc[product].active + acc[product].pending );
  if (STATUS[product].max === acc[product].active + acc[product].pending) {
    const pName = product;
    $.confirm({
      title: `&nbsp;Warning about <b>${pName}</b> User Count`,
      columnClass: 'col-md-5',
      icon: 'fas fa-exclamation-triangle fa-pulse',
      type: 'orange',
      content: `<p>If you SAVE now, <b>${pName}</b> will have reached <b>${
        STATUS[product].max
      }</b>,
      the <u>maximum</u> number of users.</p>
      <p>Do not add any <b>${pName}</b> users, or edit existing user(s) to this product.</p>
      <p>You will not <i>then</i> be able to SAVE this edited User List.</p>`,
      buttons: {
        OK: {
          action: function() {
            result = true;
          },
          btnClass: 'btn-primary'
        }
      }
    });
  }
  return result;
};

const tableSetup = async (product_list) => {
  // these two Placeholder functions can be combined: use formatterParams for text
  const emailPlaceHolder = function(cell /*, formatterParams */) {
    var cellValue = cell.getValue();
    if (cellValue === '') {
      return 'User name ...';
    } else {
      return cellValue;
    }
  };
  const productPlaceHolder = function(cell /*, formatterParams*/) {
    var cellValue = cell.getValue();
    if (cellValue === '') {
      return 'Choose ...';
    } else {
      return cellValue;
    }
  };

  ////////////////////////////////////////////////////////////////
  $('#users-table').css('width', '770px');
  table = new Tabulator('#users-table', {
    historyUndo: function(action, component, data) {
      if (action === 'rowDelete') {
        table.setSort(table.getSorters());
        //let row = table.getRow(data.data.id);
        let jqRowCells = $(component.getElement())
          .find('.tabulator-cell')
          .addClass('highlight');

        setTimeout(() => {
          jqRowCells.removeClass('highlight');
          makeVisibleSaveButton(true);
        }, 700);
      }

      // cellEdit for a userId change, undoing will not force makeVisibleSaveButton
    },
    layout: 'fitColumns',
    history: true,
    pagination: 'local',
    paginationSize: 12,
    initialSort: [{ column: 'userId', dir: 'asc' }],

    columns: [
      {
        title: 'Email User Name',
        field: 'userId',
        editor: 'input',
        widthGrow: 2,
        minWidth: 120,
        formatter: emailPlaceHolder,
        validator: ['required', 'unique'],

        cellEdited: function(cell) {
          // if non-empty userId changed... then need new password
          if (cell.getData().previousUserId !== '') {
            $.confirm({
              title: '<br/>Please Confirm',
              columnClass: 'col-md-4',
              content: `Changing User Name: <b>${cell.getData().userId}</b>`,
              type: 'blue',
              buttons: {
                confirm: {
                  btnClass: 'btn-blue',
                  action: function() {
                    let rowdata = cell.getRow().getData();
                    table.updateRow(rowdata.id, {
                      id: `new_${++new_count}`,
                      userId: rowdata.userId,
                      previousUserId: rowdata.userId,
                      product: rowdata.product,
                      new_pass: randomPassword()
                    });
                    // net user count change --> zero, user being replaced by new pending
                    // adjustStatus(rowdata, 'userId_change');
                    enableClipboardButton();
                    makeVisibleSaveButton(true);
                  },
                  keys: ['enter']
                },
                cancel: function() {
                  // reverse change
                  table.undo();
                }
              }
            });
          }
        }
        // cellEditCancelled: function(cell) {
        //   //cell - cell component
        //   // TODO: needed?
        //   console.log('cencelled', '|' + cell.getValue() + '|');
        // }
      },
      product_list.length === 1
        ? {
            // have only one product
            title: 'Product',
            width: 110,
            field: 'product',
            align: 'center'
          }
        : {
            // have multiple products - so use a select list
            title: 'Product',
            width: 110,
            field: 'product',
            editor: 'select',
            editorParams: { values: product_list },
            formatter: productPlaceHolder,
            align: 'center',
            cellEdited: function(cell) {
              if (!countWarning(cell)) {
                // changing product can impact counts
                makeVisibleSaveButton(true);
              }
            }
          },
      {
        title: 'Temp Password',
        minWidth: 100,
        cssClass: 'passwords',
        field: 'new_pass'
      },
      {
        title: 'Change',
        width: 70,
        field: 'change',
        align: 'center',
        headerSort: false,
        cellClick: function(e, cell) {
          // reset id to new_# and make into a new password
          let rowdata = cell.getRow().getData();
          table.updateRow(rowdata.id, {
            id: `new_${++new_count}`,
            userId: rowdata.userId,
            previousUserId: rowdata.userId,

            product: rowdata.product,
            new_pass: randomPassword()
          });
          // net user count change --> zero, same user becomes pending
          // adjustStatus(rowdata, 'delta');
          enableClipboardButton();
          makeVisibleSaveButton(true);
        },
        formatter: function(cell, formatterParams, onRendered) {
          //cell - the cell component
          //formatterParams - parameters set for the column
          //onRendered - function to call when the formatter has been rendered
          return cell.getRow().getData().new_pass !== OLDPASS ? '&Delta;' : ''; //return the contents of the cell;
        }
      },
      {
        title: '<i class="far fa-trash-alt"></i>',
        formatter: 'buttonCross',
        width: 50,
        align: 'center',
        headerSort: false,
        cellClick: function(e, cell) {
          let row = cell.getRow();
          let jqRowCells = $(row.getElement())
            .find('.tabulator-cell')
            .addClass('del_highlight');
          // confirm deletion
          let data = row.getData();
          // if (data.userId === '') data.userId = 'undefined';
          // if (data.product === '') data.product = 'undefined';
          $.confirm({
            title: '<br/>Confirm User Removal!',
            columnClass: 'col-md-4',
            type: 'orange',
            content: `<div class="confirm">User: <b>${
              data.userId
            }</b>&nbsp;&nbsp;Product: ${data.product}</div>`,
            buttons: {
              confirm: {
                btnClass: 'btn-primary',
                action: function() {
                  setTimeout(() => {
                    jqRowCells.removeClass('del_highlight');
                    row.delete();
                    makeVisibleSaveButton(true);
                  }, 700);
                },
                keys: ['enter']
              },

              cancel: function() {
                jqRowCells.removeClass('del_highlight');
              }
            }
          });
        }
      }
    ]
  });

  // const adjustStatus = (olddata, operation) {
  //   const old_new_pass = olddata.new_pass;
  //   switch(operation) {
  //     case 'userId_change':

  //     break;

  //     case 'delete':
  //       if(old_new_pass.match('^3D')) { // unverified new password

  //       } else if(old_new_pass === OUTOFDATE) { // expired password

  //       } else if(old_new_pass === OLDPASS) { // unverified

  //       } else { // active user

  //       }
  //     break;

  //     case 'delta':

  //     break;
  //   }
  //   showStatus();
  // }
  await getUsers($('#company').text()).then((tabledata) => {
    tabledata.forEach((rowdata) => (rowdata.previousUserId = rowdata.userId));
    // initial state previous = current
    table.setData(tabledata);
    showStatus();
  });

  $(window).resize(function() {
    table.redraw();
  });

  $('#tabulator-controls input[name=email]').on('keyup', function() {
    table.setFilter('userId', 'like', $(this).val());
  });

  // $('#tabulator-controls  button[name=hide-col]').on('click', function() {
  //   $(this).toggleClass('col-hide');

  //   if ($(this).hasClass('col-hide')) {
  //     table.showColumn('rating');
  //   } else {
  //     table.hideColumn('rating');
  //   }
  // });

  $('#tabulator-controls button[name=undo]').on('click', function() {
    table.undo();
  });

  const showNewPasswords = () => {
    // screen for incomplete rows
    const site = $('#company').text(); // site name from hidden div in DOM
    let newUsers = table.getData().filter((rowdata, index) => {
      return rowdata.new_pass.match('^3D'); // a newly generated password
    });
    if (
      newUsers.some(
        (user) => user.userId === '' || user.product === '' // required fields
      )
    ) {
      return '';
    }
    // build list of emails and temp passwords

    let pieces = newUsers.map(
      (user) => `${user.userId}@${site},${user.new_pass}`
    );
    let height = (em(pieces.length) * 2) / 3;
    let content = pieces.join('\n');
    return `<p>Click <span class="bg-primary text-white">COPY</span> to put user names and passwords on clipboard.</p><textarea id="newUsersTemp" style="width:90%;height:${height}px">${content}</textarea>`;
  };

  const em = (input) => {
    var emSize = parseFloat($('h1').css('font-size'));
    return emSize * input;
  };

  // new paswords button (to allow copying of emails and new passwords to clipboard)
  $('#tabulator-controls  button[name=new_pass_to_clipboard]').on(
    'click',
    function() {
      const content = showNewPasswords();
      if (content !== '') {
        $.confirm({
          closeIcon: true, // explicitly show the close icon
          title: 'New Users and Temporary Passwords&nbsp;&nbsp;',
          columnClass: 'col-md-6',
          content: content,
          type: 'blue',
          typeAnimated: false,
          buttons: {
            copy: {
              btnClass: 'btn-primary',
              keys: ['enter'],
              action: function() {
                const elem = document.getElementById('newUsersTemp');
                elem.style.width = '90%';
                elem.select();
                document.execCommand('copy');
              }
            }
          }
        });
      } else {
        $.confirm({
          title: '<br/>Added Users Not Complete!',
          icon: 'fas fa-exclamation-triangle',
          type: 'red',
          content: 'Missing <b>User Email Name(s)</b> or <b>Password(s)</b>',
          columnClass: 'col-md-4',
          autoClose: 'OK|4000',
          buttons: {
            OK: function() {}
          }
        });
      }
    }
  );
  const enableClipboardButton = () => {
    $('#tabulator-controls  button[name=new_pass_to_clipboard]').prop(
      'disabled',
      false
    );
  };
  // constants for code readability (indexs of acc array below)

  const makeVisibleSaveButton = (state) => {
    if (state) {
      $('button[name=toDb]').css('visibility', 'visible');
      $('#status > table').addClass('outOfDate');
      $('#note').css('visibility', 'visible');
    } else {
      $('button[name=toDb]').css('visibility', 'hidden');
      $('#status > table').removeClass('outOfDate');
    }
  };

  // add a new user
  $('#tabulator-controls  button[name=add-row]').on('click', function() {
    // cannot check if this new user impacts product count totals until product defined
    let rowData = {
      id: `new_${++new_count}`,
      userId: '',
      previousUserId: '',
      product: product_list.length === 1 ? product_list[0] : '',
      new_pass: randomPassword()
    };
    // table.addRow(rowData, true); // add at top
    table
      .addRow(rowData, true)
      .then(function(row) {
        countWarning(row.getCell('product'));
        row
          .getCell('userId')
          .getElement()
          .focus();
        enableClipboardButton();
        makeVisibleSaveButton(true);
      })
      .catch(function(error) {
        //handle error updating data
      });
  });

  // Save to Db
  $('button[name=toDb]').on('click', function() {
    let data = table.getData();
    const NOW = new Date().valueOf();
    let acc = calculateNumToSave();

    if (
      data.some((rowdata) => rowdata.userId === '' || rowdata.product === '')
    ) {
      // NO SAVE: empty fields
      $.confirm({
        title: '&nbsp;Cannot Save to Database',
        icon: 'fas fa-shield-alt',
        type: 'red',
        content: `<p class="errmsg">Some User Id(s) ${
          product_list.length === 1 ? '' : ' or Product(s)'
        } are undefined.</p>`,
        columnClass: 'col-md-4',
        buttons: {
          continue: {
            text: 'Keep Editing',
            btnClass: 'btn-primary'
          }
        }
      });
    } else {
      let maxProblems = Object.keys(STATUS).filter(
        (product) =>
          STATUS[product].max < acc[product].active + acc[product].pending
      );
      if (maxProblems.length > 0) {
        // NO SAVE: exceeded max for at least one product

        let content = maxProblems.map(
          (
            product
          ) => `<div class="confirm"><p><b>${product}:</b> Active+Pending = ${acc[
            product
          ].active + acc[product].pending}
          &nbsp;exceeds the maximum of ${STATUS[product].max}.</p></div>`
        );

        $.confirm({
          title: `</br>&nbsp;Cannot Save to Database.<p class="errmsg"></br>&nbsp;Please remove some ${maxProblems.join(
            ', and '
          )} user(s).</p>`,
          icon: 'fas fa-shield-alt',
          type: 'red',
          content: content,
          columnClass: 'col-md-7',
          buttons: {
            continue: {
              text: 'Keep Editing',
              btnClass: 'btn-primary'
            }
          }
        });
      } else {
        // SAVE
        let expired = data.filter(
          (rowdata) => rowdata.temporary && NOW > rowdata.temporary
        );
        if (expired.length !== 0) {
          // warning re expired data
          const title =
            expired.length === 1
              ? '&nbsp;One User has an <b>Expired</b> Login Date'
              : `&nbsp;${expired.length} Users have <b>Expired</b> Login Dates`;

          $.confirm({
            title: title,
            icon: 'fas fa-exclamation-triangle',
            type: 'orange',
            content:
              '<p class="errmsg">KEEP User(s) in Database, or REMOVE?</p>',
            useBootstrap: false,
            columnClass: 'col-md-4',
            closeIcon: true,
            buttons: {
              keep: {
                btnClass: 'btn-primary',
                text: 'Keep',
                action: function() {
                  saveToDb(data);
                }
              },
              remove: {
                btnClass: 'btn-secondary',
                text: 'Remove',
                action: function() {
                  saveToDb(
                    data.filter((rowdata) => !rowdata.new_pass.match('^-- ex'))
                  );
                }
              },
              cancel: {
                btnClass: 'btn-info',
                text: 'Cancel Save'
              }
            }
          });
        } else {
          saveToDb(data); // no issues
        }
      }
    }
  });

  const addMinutes = (date, minutes) => {
    return new Date(date.getTime() + minutes * 60000);
  };

  const addDays = (date, days) => {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  const saveToDb = (data) => {
    const now = new Date();
    let dataToSet = JSON.stringify(
      data
        .map((user) => {
          // rowdata.new_pass !== undefined && rowdata.new_pass.match('^3D')
          if (typeof user.id === 'string' && user.id.match('^new_')) {
            // starts with 'new_'
            // new user, or old temparary
            const doc = {
              userId: user.userId.toLowerCase(), // save all userIds in lower case
              product: user.product
            };
            if (!user.new_pass.match('^3D')) {
              // not brand new
              doc.passwd = user.passwd;
              doc.temporary = user.temporary;
            } else {
              // new temporary user with passwd to be hashed in route
              doc.passwd = user.new_pass; // will be encrypted in route code
              doc.temporary = addDays(now, 3).valueOf(); // 3 days from NOW in 1970/msec
              //addMinutes(now, 30).valueOf(); // 30 min from NOW in 1970/msec
              doc.new = true; // forces encryprion of passwd on save
            }
            return doc;
          } else {
            // possibly modified old user, maintaining passwd
            return {
              userId: user.userId,
              product: user.product,
              passwd: user.passwd
            };
          }
        })
        .filter((user) => user !== null)
    );

    $.post({
      url: '/replaceUsers',
      data: { data: dataToSet, site: $('#company').text() },
      dataType: 'json'
    })
      .done(async (result) => {
        if (result.error) {
          alert('/replaceUsers Error ' + JSON.stringify(error, null, 4));
        }
        // success, now refresh page
        await getUsers($('#company').text()).then((tabledata) => {
          $('#tabulator-controls  button[name=new_pass_to_clipboard]').prop(
            'disabled',
            true
          );
          makeVisibleSaveButton(false);
          $('#note').css('visibility', 'hidden');
          table.setData(tabledata);

          showStatus();
        });
      })
      .fail((error) => {
        alert('/replaceUsers Error ' + JSON.stringify(error, null, 4));
      });
  };
  $('#tabulator-controls  button[name=download]').on('click', function() {
    table.download('csv', 'Tabulator Example Download.csv');
  });
};


