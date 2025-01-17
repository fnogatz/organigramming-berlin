import Ajv from "ajv";
import addFormats from "ajv-formats";
import definitions from "../schemas/organization_chart";
import { Subject } from "rxjs";

const subject1 = new Subject();
const subject2 = new Subject();

export const dragNodeService = {
  sendDragInfo: (id) => subject1.next({ draggedNodeId: id }),
  clearDragInfo: () => subject1.next(),
  getDragInfo: () => subject1.asObservable(),
};

export const selectNodeService = {
  sendSelectedNodeInfo: (id) => subject2.next({ selectedNodeId: id }),
  clearSelectedNodeInfo: () => subject2.next(),
  getSelectedNodeInfo: () => subject2.asObservable(),
};

export const toSnakeCase = (str) => {
  return str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map((x) => x.toLowerCase())
    .join("_");
};

export const isDefiend = (object) => {
  return typeof object !== "undefined" && object !== null;
};

export const getItemByPath = (obj, path) =>
  path.reduce((obj, item) => obj[item], obj);

export const createItemByPath = (obj, path, value) => {
  var lastKey = path.pop();
  for (var i = 0; i < path.length; i++) {
    obj = obj[path[i]] = obj[path[i]] || {};
  }
  if (lastKey) obj = obj[lastKey] = value;
  return obj;
};

export const handleDropEnd = async (e, dsDigger) => {
  if (
    !e.destination ||
    (e.source.droppableId === e.destination.droppableId &&
      e.destination.index === e.source.index)
  ) {
    return;
  }

  const sourcePath = e.source.droppableId.split("_");
  const destinationPath = e.destination.droppableId.split("_");

  let sourceNode = await dsDigger.findNodeById(sourcePath[0]);
  sourcePath.shift();

  const sourceList = getItemByPath(sourceNode, sourcePath);

  const item = await JSON.parse(JSON.stringify(sourceList[e.source.index]));
  sourceList.splice(e.source.index, 1);

  createItemByPath(sourceNode, sourcePath, sourceList);

  await dsDigger.updateNode(sourceNode);

  let destinationNode = await dsDigger.findNodeById(destinationPath[0]);
  destinationPath.shift();

  let destinationList = getItemByPath(destinationNode, destinationPath);

  if (isDefiend(destinationList)) {
    if (e.destination.index >= destinationList.length) {
      destinationList.push(item);
    } else {
      destinationList.splice(e.destination.index, 0, item);
    }
  } else {
    createItemByPath(destinationNode, destinationPath, [item]);
  }

  await dsDigger.updateNode(destinationNode);
  return { ...dsDigger.ds };
};

export const validateData = (data) => {
  const ajv = new Ajv();

  //add custom formats to validate against
  addFormats(ajv);
  ajv.addFormat(
    "data-url",
    /^data:([a-z]+\/[a-z0-9-+.]+)?;(?:name=(.*);)?base64,(.*)$/
  );
  ajv.addFormat("integer", /([0-9])/);
  ajv.addFormat(
    "color",
    /^(#?([0-9A-Fa-f]{3}){1,2}\b|aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow|(rgb\(\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*\))|(rgb\(\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*\)))$/
  );
  ajv.addVocabulary(["version", "enumNames"]);

  const validate = ajv.compile(definitions);
  return [validate(data), validate.errors];
};
