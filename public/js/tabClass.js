"use strict";
/*exported Job, Tab, Section, Step */

class Job {
    constructor(job, user, tabs) {
        this.job = job;
        this.user = user;
        this.tabs = (tabs === undefined) ? [] : tabs;
    }
    getName() {
        return this.job.split('|').join(' | ');
    }
    getUser() {
        return this.user;
    }
    // get size() {
    //     return this.tabs.length;
    // }
    getTabs() {
        return this.tabs;
    }
    pushTab(t) {
        this.tabs.push(t);
    }
    toString(lead) {
        lead = (lead === undefined) ? "" : lead;
        let result = lead + 'Job: { \n\tUser: ' + this.user + ',\n\tJob: ' + JSON.stringify(this.job) + '\n';
        this.getTabs().forEach(
            (tab, idx) => {
                result += (idx === 0) ? tab.toString('\t') : ',\n' + tab.toString('\t');
            });
        return result + '\n}';
    }

}


class Tab {
    constructor(tabName, sections) {
        if (sections === undefined) {
            sections = [];
        } else if (sections instanceof Section) {
            sections = [sections];
        }
        this.tabName = tabName;
        this.sections = sections;
    }
    // get size() {
    //     return this.sections.length;
    // }
    getTabName() {
        return this.tabName;
    }
    getSections() {
        return this.sections;
    }
    pushSection(s) {
        this.sections.push(s);
    }
    toString(lead) {
        lead = (lead === undefined) ? "" : lead;
        let result = lead + 'Tab: { name: ' + this.tabName + '\n';
        this.sections.forEach(
            (section, idx) => {
                result += (idx === 0) ? section.toString('\t\t') : ',\n' + section.toString('\t\t');
            });
        return result + '\n' + lead + '}';
    }

}

class Section {
    constructor(sectionName, steps) {
        if (steps === undefined) {
            steps = [];
        } else if (steps instanceof Step) {
            steps = [steps];
        }
        this.sectionName = sectionName;
        this.steps = steps;
    }
    // get size() {
    //     return this.steps.length;
    // }
    getSectionName() {
        return this.sectionName;
    }
    pushStep(s) {
        this.steps.push(s);
    }
    toString(lead) {
        lead = (lead === undefined) ? "" : lead;
        let result = lead + 'Section: { name: ' + this.sectionName + '\n';
        this.steps.forEach(
            (step, idx) => {
                result += (idx === 0) ? step.toString('\t\t\t') : ',\n' + step.toString('\t\t\t');
            });
        return result + '\n' + lead + '}';
    }
    getSteps() {
        return this.steps;
    }
    getStep(idx) {
        return this.steps[idx];
    }
    addStep(idx, step) {
        let temp = [];
        for (let i = 0; i < idx; i++) {
            temp.push(this.getStep(i));
        }
        temp.push(step);
        for (let i = idx; i < this.steps.length; i++) {
            temp.push(this.getStep(i));
        }
        this.steps = temp;
    }
    removeStep(idx) {
        this.steps.splice(idx, 1);
    }
    swapStep(idx1, idx2) {
        let temp = this.getStep(idx1);
        this.setStep(idx1, this.getStep(idx2));
        this.setStep(idx2, temp);
    }
}

class Step {
    constructor(stepObj) {
        this.stepName = stepObj.stepName + ""; // make sure it's a string
        this.images_id = stepObj.images_id;
    }
    
    getStepName() {
        return this.stepName;
    }
    getImagesId() {
        return this.images_id;
    }
    toString(lead) {
        lead = (lead === undefined) ? "" : lead;
        return lead + "Step: " + this.stepName.valueOf();
    }
}