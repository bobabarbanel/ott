"use strict";
/*exported LinkGroup */
// linkGroupClass.js


class LinkGroup {
    
    constructor(prev, next, start, stop, link) {
        this.start = start;
        this.stop = stop;
        this.prev = prev;
        this.next = next;
        this.link = link;
        // console.log({prev, next, start, stop, link});
    }

    getPrev() {
        return this.prev;
    }
    setPrev(n) {
        this.prev = n;
    }

    getNext() {
        return this.next;
    }
    setNext(n) {
        this.next = n;
    }

    getLink() {
        return this.link;
    }
    setLink(n) {
        this.link = n;
    }

    getStart() {
        return this.start;
    }
    setStart(n) {
        this.start = n;
    }

    getStop() {
        return this.stop;
    }
    setStop(n) {
        this.stop = n;
    }
    show() {
        if(prev) { console.log("prev", prev.link);}
        if(prev) { console.log("next", next.link);}
        const {start,stop,link} = this;
        console.log("\t", {start, stop, link});
    }
}