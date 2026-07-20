import React from "react";

const ids = [
  "0424f812-3b19-4263-bd08-a3baceaeb51a",
  "7dfcca81-38bb-4cfd-8992-f0aa785d26c9",
  "null",
  null
];

const Box = ({ id }) => (
  <div className="w-20 h-20 bg-blue-500 text-white flex items-center justify-center rounded-md">
    {id.slice(0, 4)}
  </div>
);

const FixedGrid = () => {
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-4">
      {ids.map((id, index) => (
        <div key={index} className="w-20 h-20">
          {id ? <Box id={id} /> : null}
        </div>
      ))}
    </div>
  );
};

export default FixedGrid;
