-- helper.lua
-- List features and usage of the schema.

local function translator(input, seg)
  if input:find('^help$') then
    local table = {
          { '折分显隐', 'Ctrl + Shift + H' }
        , { '注解切换', 'Ctrl + Shift + J' }
        , { '单字模式', 'Ctrl + Shift + k' }
        , { '字集切换', 'Ctrl + Shift + U' }
        , { '繁简切换', 'Ctrl + Shift + F' }
        , { '临时拼音', 'z键引导临时拼音' }
        , { '重复历史', 'z键兼有重复历史' }
        , { '以形查音', '~键引导以形查音' }
        , { '精准造词', '`键引导精准造词' }
        , { '选单', 'Ctrl+` 或 F4' }
        , { 'lua字符串', '以大写字母开头触发' }
        , { '农历反查', '任意大写字母引导+数字日期' }
        , { '金额大写', '任意大写字母引导+数字' }
        , { '时间', rv_var["date_var"] .. '｜' .. rv_var["time_var"] .. '｜' .. rv_var["week_var"] }
        , { '历法', rv_var["nl_var"] .. '｜' .. rv_var["jq_var"] }
        , { '帮助', 'help' }
        , { '注释', 'Ctrl + Shift + Return' }
        , { '官网', 'http://www.98wubi.com' }
        , { '下载', 'http://98wb.ys168.com' }
        , { '项目', 'https://github.com/98wb' }
    }
    for k, v in ipairs(table) do
      local cand = Candidate('help', seg.start, seg._end, v[2], ' ' .. v[1])
      cand.preedit = input .. '\t简要说明'
      yield(cand)
    end
  end
end

return translator