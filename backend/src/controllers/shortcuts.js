const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const bplistCreator = require('bplist-creator');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Function to generate a modified iOS shortcut
const generateShortcut = async (req, res) => {
    try {
        const { templateName, userId, jobId, fileName } = req.body;

        if (!templateName || !userId || !jobId) {
            return res.status(400).json({
                success: false,
                message: 'Template name, user ID, and job ID are required'
            });
        }

        // Log the request for debugging
        console.log('Shortcut request:', { templateName, userId, jobId, fileName });

        // Determine which template file to use based on templateName
        let templatePath;
        
        // Extract just the filename from the templateName path
        const templateBaseName = path.basename(templateName);
        
        if (templateBaseName.toLowerCase().includes('templatein') || templateBaseName.toLowerCase().includes('templatintjson')) {
            if (fs.existsSync(path.join(__dirname, '../../templates/TemplateInJson.shortcut'))) {
                templatePath = path.join(__dirname, '../../templates/TemplateInJson.shortcut');
            } else {
                templatePath = path.join(__dirname, '../../templates/Templatein.shortcut');
            }
        } else if (templateBaseName.toLowerCase().includes('templateout') || templateBaseName.toLowerCase().includes('templateoutjson')) {
            if (fs.existsSync(path.join(__dirname, '../../templates/TemplateOutJson.shortcut'))) {
                templatePath = path.join(__dirname, '../../templates/TemplateOutJson.shortcut');
            } else {
                templatePath = path.join(__dirname, '../../templates/Templateout.shortcut');
            }
        } else {
            console.error(`Invalid template name: ${templateName}`);
            return res.status(400).json({
                success: false,
                message: `Invalid template name: ${templateName}`
            });
        }

        // Check if template file exists
        if (!fs.existsSync(templatePath)) {
            console.error(`Template file not found: ${templatePath}`);
            return res.status(404).json({
                success: false,
                message: `Template file not found: ${path.basename(templatePath)}`
            });
        }

        // Read the template file
        const templateBuffer = await readFileAsync(templatePath);
        
        let modifiedBuffer;
        
        // Check if the template path has 'Json' in it to determine processing method
        if (templatePath.includes('Json')) {
            try {
                // Process as JSON
                const jsonString = templateBuffer.toString('utf-8');
                const jsonData = JSON.parse(jsonString);
                
                // Process the JSON structure to replace userId and jobId
                const processedJson = processShortcutJson(jsonData, userId, jobId);
                
                // Convert JSON to binary plist format used by .shortcut files
                modifiedBuffer = Buffer.from(bplistCreator(processedJson));
                console.log('Successfully converted JSON to binary plist format');
            } catch (error) {
                console.error('Error processing JSON shortcut:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error processing JSON shortcut: ' + error.message
                });
            }
        } else {
            // Process as binary
            console.log('Processing as binary shortcut file');
            let fileContent = templateBuffer.toString('binary');
            
            // Replace userId and jobId in the shortcut file using regex
            fileContent = fileContent.replace(/"userId"\s*:\s*"[^"]*"/g, `"userId":"${userId}"`);
            fileContent = fileContent.replace(/"jobId"\s*:\s*"[^"]*"/g, `"jobId":"${jobId}"`);
            
            // Add additional common patterns that might be used in the shortcut files
            fileContent = fileContent.replace(/"user_id"\s*:\s*"[^"]*"/g, `"user_id":"${userId}"`);
            fileContent = fileContent.replace(/"job_id"\s*:\s*"[^"]*"/g, `"job_id":"${jobId}"`);
            
            // For parameters that might be used without quotes
            fileContent = fileContent.replace(/"userId"\s*:\s*(\d+)/g, `"userId":${userId}`);
            fileContent = fileContent.replace(/"jobId"\s*:\s*(\d+)/g, `"jobId":${jobId}`);
            
            // Convert back to Buffer
            modifiedBuffer = Buffer.from(fileContent, 'binary');
        }
        
        // Create the temp directory if it doesn't exist
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Save the modified file to a temporary location
        const outputPath = path.join(tempDir, fileName);
        await writeFileAsync(outputPath, modifiedBuffer);

        // Check if the request wants a direct download or a shortcut URL
        const wantsShortcutUrl = req.query.shortcutUrl === 'true';
        
        if (wantsShortcutUrl) {
            // Set content type for shortcut file
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
            
            // Get the base URL from request
            const protocol = req.protocol;
            const host = req.get('host');
            const baseUrl = `${protocol}://${host}`;
            
            // Create the shortcut URL
            const shortcutUrl = `shortcuts://import-shortcut?url=${encodeURIComponent(`${baseUrl}/shortcuts/download/${fileName}`)}`;
            
            res.json({
                success: true,
                shortcutUrl: shortcutUrl,
                downloadUrl: `${baseUrl}/shortcuts/download/${fileName}`
            });
        } else {
            // Set headers for direct file download
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
            
            // Send the file
            res.sendFile(outputPath, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Error sending file'
                    });
                }
                
                // Clean up the temporary file after a small delay to ensure it's sent
                setTimeout(() => {
                    fs.unlink(outputPath, (unlinkErr) => {
                        if (unlinkErr) console.error('Error deleting temporary file:', unlinkErr);
                    });
                }, 1000);
            });
        }
    } catch (error) {
        console.error('Error generating shortcut:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
};

// Helper function to process JSON-structured shortcut files
function processShortcutJson(jsonData, userId, jobId) {
    // Deep clone the JSON to avoid modifying the original
    const processed = JSON.parse(JSON.stringify(jsonData));
    
    // Look for the dictionary action that contains userId and jobId
    if (processed.WFWorkflowActions && Array.isArray(processed.WFWorkflowActions)) {
        for (const action of processed.WFWorkflowActions) {
            // Look for dictionary actions
            if (action.WFWorkflowActionIdentifier === 'is.workflow.actions.dictionary') {
                if (action.WFWorkflowActionParameters && action.WFWorkflowActionParameters.WFItems) {
                    const items = action.WFWorkflowActionParameters.WFItems.Value.WFDictionaryFieldValueItems;
                    
                    if (Array.isArray(items)) {
                        // Update userId and jobId in the dictionary
                        for (const item of items) {
                            if (item.WFKey && item.WFKey.Value && item.WFKey.Value.string === 'userId') {
                                if (item.WFValue && item.WFValue.Value) {
                                    item.WFValue.Value.string = String(userId);
                                }
                            } else if (item.WFKey && item.WFKey.Value && item.WFKey.Value.string === 'jobId') {
                                if (item.WFValue && item.WFValue.Value) {
                                    item.WFValue.Value.string = String(jobId);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    return processed;
}

module.exports = {
    generateShortcut
}; 