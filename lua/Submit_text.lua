local function commit_text_processor(key, env)
	local engine = env.engine
	local context = engine.context
	local input_text = context.input
	if input_text:find("^(%l+)$") then env.last_commit_text=context:get_commit_text() end
	local m,n=input_text:find("^(%l+)([%[%/%]\\])")
	if n~=nil and m~=nil then
		env.last_commit_text=env.last_commit_text or ""
		if (context:is_composing()) then
			-- local focus_text = context:get_commit_text()
			-- engine:commit_text(focus_text)
			engine:commit_text(env.last_commit_text..CandidateText[1])  -- 第1个候选标点符号
			context:clear()
			return 1
		end
	end
	return 2
end

return commit_text_processor