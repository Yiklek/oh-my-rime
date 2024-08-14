local function Lfmt(logger, level)
  return function(fmt, ...)
    local info = debug.getinfo(2, "Sl")
    local lineinfo = info.short_src .. ":" .. info.currentline
    local msg = string.format("[%-6s] " .. fmt .. "\n", logger, ...)
    log[level](msg, 1234)
  end
end

return Lfmt
