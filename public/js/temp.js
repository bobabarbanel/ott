db.spec_terms.update({
    _id:"hand_tools",
    "terms.files.primary": {$exists: true}
 },{
    $unset: {
       "terms.files.$[].primary" : ""
    }
 })