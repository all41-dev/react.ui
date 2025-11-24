import { Tooltip } from "../../components/tooltip/Tooltip";

export function TooltipDemo() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Tooltip Demo</h2>
      <p className="mb-6 text-gray-600">Hover over the elements below to see tooltips in different positions.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Placement Variants</h3>
          
          <div className="flex flex-col gap-4 items-start">
            <Tooltip content="This is a top tooltip" place="top">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
                Hover me (Top)
              </button>
            </Tooltip>
            
            <Tooltip content="This is a right tooltip" place="right">
              <button className="px-4 py-2 bg-green-600 text-white rounded-md">
                Hover me (Right)
              </button>
            </Tooltip>
            
            <Tooltip content="This is a bottom tooltip" place="bottom">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md">
                Hover me (Bottom)
              </button>
            </Tooltip>
            
            <Tooltip content="This is a left tooltip" place="left">
              <button className="px-4 py-2 bg-orange-600 text-white rounded-md">
                Hover me (Left)
              </button>
            </Tooltip>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">On Different Elements</h3>
          
          <div className="flex flex-col gap-4 items-start">
            <Tooltip content="Tooltips work on text elements too!">
              <span className="text-blue-600 underline cursor-pointer">
                Hover over this text
              </span>
            </Tooltip>
            
            <Tooltip content="Icon with helpful information">
              <div className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center cursor-pointer">
                ?
              </div>
            </Tooltip>
            
            <Tooltip content="This is a longer tooltip message that demonstrates how multiline content can be displayed in the tooltip component.">
              <button className="px-4 py-2 bg-gray-600 text-white rounded-md">
                Long Tooltip
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
