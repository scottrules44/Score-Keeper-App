"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPbxGroup = void 0;
function addPbxGroup(xcodeProject, { targetName }) {
    // Add PBX group
    const { uuid: pbxGroupUuid } = xcodeProject.addPbxGroup([
        "ContentView.swift",
        "SampleWatchApp.swift",
        "ViewModel.swift",
        "Assets.xcassets",
        "Preview Assets.xcassets",
    ], `"${targetName}"`, `"../${targetName}"`);
    // Add PBXGroup to top level group
    const groups = xcodeProject.hash.project.objects["PBXGroup"];
    if (pbxGroupUuid) {
        Object.keys(groups).forEach(function (key) {
            if (groups[key].name === undefined && groups[key].path === undefined) {
                xcodeProject.addToPbxGroup(pbxGroupUuid, key);
            }
        });
    }
}
exports.addPbxGroup = addPbxGroup;
