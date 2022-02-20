function date_translator(input, seg)
   if (input == "orq") then
      --- Candidate(type, start, end, text, comment)
      yield(Candidate("date", seg.start, seg._end, os.date("%Y年%m月%d日"), ""))
      yield(Candidate("date", seg.start, seg._end, os.date("%Y-%m-%d"), " "))
   end
end

function time_translator(input, seg)
   if (input == "ouj") then
      local cand = Candidate("time", seg.start, seg._end, os.date("%H:%M"), " ")
      cand.quality = 1
      yield(cand)
   end
end

local local_require = require("util").get_local_require("flypy")
calculator_translator = local_require("calculator_translator")
